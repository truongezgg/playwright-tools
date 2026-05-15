#!/usr/bin/env node

/**
 * Search the web using Playwright with stealth browser support.
 *
 * Usage:
 *   pt-search [engine] [query] [count] [options]
 *
 * Options:
 *   --cdp URL       CDP server URL (default: http://localhost:9222)
 *   --no-cloak      Force local Playwright (no CDP)
 *   --eval          Use eval mode instead of snapshot
 *   --rawsnapshot   Output raw snapshot YAML
 *   --headless      Force headless mode
 *   --headed        Force headed mode (for CAPTCHA solving)
 *
 * Default mode: DDG = headless, Google/Bing = headed (they block headless)
 *
 * Examples:
 *   pt-search ddg "cloakbrowser" 5
 *   pt-search google "next.js security" 10
 *   pt-search bing "seavoca" 3
 *   pt-search ddg "query" 5 --headless
 */

import { connectBrowser, getPage, closeBrowser } from './lib/browser.js';
import { parseSnapshot } from './lib/snapshot.js';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const params = args.filter(a => !a.startsWith('--'));

const engine = params[0] || 'ddg';
const query = params[1];
const count = parseInt(params[2]) || 5;

const cdpUrl = flags.find(f => f.startsWith('--cdp='))?.split('=')[1] || 'http://localhost:9222';
const noCloak = flags.includes('--no-cloak');
const useEval = flags.includes('--eval');
const rawSnapshot = flags.includes('--rawsnapshot');
const explicitHeadless = flags.includes('--headless');
const explicitHeaded = flags.includes('--headed');

// Default: DDG = headless, Google/Bing = headed (they block headless)
const headless = explicitHeadless ? true : (explicitHeaded ? false : engine === 'ddg');

if (!query) {
  console.error('Usage: pt-search [engine] [query] [count] [--cdp URL] [--no-cloak] [--eval] [--rawsnapshot] [--headless]');
  console.error('Example: pt-search ddg "cloakbrowser" 5');
  console.error('       pt-search google "next.js" 10 --eval');
  process.exit(1);
}

const urls = {
  ddg: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
};

const selectors = {
  ddg: { container: 'article' },
  google: { container: '.tF2Cxc' },
  bing: { container: 'li.b_algo' },
};

if (!urls[engine]) {
  console.error(`Unknown engine: ${engine}. Use: ddg, google, bing`);
  process.exit(1);
}

if (!selectors[engine]) {
  console.error(`Unknown engine: ${engine}. Use: ddg, google, bing`);
  process.exit(1);
}

const sel = selectors[engine];
const url = urls[engine];

// Eval extraction code
const evalCode = {
  ddg: `(() => {
    function getSnippet(el) {
      var spans = el.querySelectorAll('span');
      for (var j = 0; j < spans.length; j++) {
        var t = spans[j].innerText?.trim();
        if (t && t.length > 50 && !t.includes('AD')) return t;
      }
      return '';
    }
    return [...document.querySelectorAll('article')].map(el => ({
      title: el.querySelector('h2')?.innerText?.trim(),
      link: el.querySelector('h2 a')?.href,
      snippet: getSnippet(el),
    }))
    .filter(r => r.title)
    .filter(r => !r.title.includes('\\nAD') && !r.link?.match(/duckduckgo\\.com\\/.*\\.js/))
    .slice(0, ${count});
  })()`,
  google: `(() => {
    return [...document.querySelectorAll('.tF2Cxc')].map(el => ({
      title: el.querySelector('h3')?.innerText?.trim(),
      link: el.querySelector('a')?.href,
      snippet: el.querySelector('.VwiC3b, .IsZvec, [data-sncf]')?.innerText?.trim() || '',
    }))
    .filter(r => r.title)
    .slice(0, ${count});
  })()`,
  bing: `(() => {
    return [...document.querySelectorAll('li.b_algo')].map(el => ({
      title: el.querySelector('h2')?.innerText?.trim(),
      link: el.querySelector('h2 a')?.href,
      snippet: el.querySelector('.b_caption p')?.innerText?.trim() || '',
    }))
    .filter(r => r.title)
    .slice(0, ${count});
  })()`,
};

try {
  // Connect to browser
  const cdpOptions = noCloak ? {} : { cdpUrl };
  const localOptions = { headless };
  const { browser, source } = noCloak
    ? await connectBrowser(localOptions)
    : await connectBrowser({ ...cdpOptions, ...localOptions });

  console.error(`Connected: ${source === 'cdp' ? 'Stealth server (CDP)' : 'Local Playwright'}`);

  const page = await getPage(browser);

  // Navigate
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.error(`Searching ${engine}: "${query}"`);

  // Wait for results (longer timeout for Google/Bing - they may show CAPTCHA)
  const waitTimeout = engine === 'ddg' ? 10000 : 20000;
  try {
    await page.waitForSelector(sel.container, { timeout: waitTimeout });
  } catch (e) {
    // Check for CAPTCHA
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '');
    const hasCaptcha = bodyText.includes('/sorry/') ||
                       bodyText.includes('solve the challenge') ||
                       bodyText.includes('Select all squares') ||
                       bodyText.includes('captcha') ||
                       bodyText.includes('CAPTCHA');

    if (hasCaptcha) {
      console.error('');
      console.error('⚠️  CAPTCHA detected! Please solve it in the browser.');
      console.error('Press Enter when done...');

      if (source === 'local' || source === 'chrome') {
        process.stdin.resume();
        await new Promise(resolve => process.stdin.once('data', resolve));
        await page.waitForSelector(sel.container, { timeout: 20000 });
      } else {
        console.error('Cannot solve CAPTCHA via CDP. Use --no-cloak to open local browser.');
        await closeBrowser(browser, source);
        process.exit(1);
      }
    } else {
      console.error('No results found.');
      await closeBrowser(browser, source);
      process.exit(1);
    }
  }

  let results;

  // Check if accessibility API is available
  const hasAccessibility = typeof page.accessibility?.snapshot === 'function';

  if (rawSnapshot) {
    // Raw snapshot mode
    if (!hasAccessibility) {
      console.error('Accessibility API not available with this browser. Use --eval or install Playwright browsers.');
      await closeBrowser(browser, source);
      process.exit(1);
    }
    const snapshot = await page.accessibility.snapshot();
    console.log(JSON.stringify(snapshot, null, 2));
    await closeBrowser(browser, source);
    process.exit(0);
  } else if (useEval || !hasAccessibility) {
    // Eval mode (explicit or fallback when accessibility not available)
    if (!hasAccessibility && !useEval) {
      console.error('Accessibility API not available, using eval mode...');
    }
    results = await page.evaluate(evalCode[engine]);
  } else {
    // Snapshot mode (default when available)
    console.error('Using snapshot mode...');
    try {
      const snapshot = await page.accessibility.snapshot();
      const yaml = JSON.stringify(snapshot);
      // Snapshot parsing for CDP requires YAML format
      // For now, fallback to eval
      results = await page.evaluate(evalCode[engine]);
    } catch (e) {
      console.error('Snapshot failed, using eval mode...');
      results = await page.evaluate(evalCode[engine]);
    }
  }

  // Filter ads
  results = results
    .filter(r => !r.title.includes('\nAD'))
    .filter(r => !r.link?.match(/duckduckgo\.com\/.*\.js/));

  console.log(JSON.stringify(results, null, 2));
  console.error(`Found ${results.length} results`);

  await closeBrowser(browser, source);

} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
