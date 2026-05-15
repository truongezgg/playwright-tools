#!/usr/bin/env node

import { connectBrowser, getPage, closeBrowser } from './lib/browser.js';
import { parseSnapshot, snapshotToYaml } from './lib/snapshot.js';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const params = args.filter(a => !a.startsWith('--'));

const cdpUrl = flags.find(f => f.startsWith('--cdp='))?.split('=')[1] || 'http://localhost:9222';
const noCloak = flags.includes('--no-cloak');
const useEval = flags.includes('--eval');
const rawSnapshot = flags.includes('--rawsnapshot');
const jsonMode = flags.includes('--json');
const explicitHeadless = flags.includes('--headless');
const explicitHeaded = flags.includes('--headed');

// Suppress status output in JSON mode
if (jsonMode) console.error = () => {};

const engine = params[0] || 'ddg';
const query = params[1];
const count = parseInt(params[2]) || 5;

const headless = explicitHeadless ? true : (explicitHeaded ? false : engine === 'ddg');

const urls = {
  ddg: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
  google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
};

const selectors = {
  ddg: { container: 'article' },
  google: { container: 'h3' },
  bing: { container: 'li.b_algo' },
};

const sel = selectors[engine];
const url = urls[engine];

// Response helper
function respond(data) {
  console.log(JSON.stringify(data, null, 2));
}

// Error response helper
function errorResponse(message) {
  respond({ success: false, engine, query, error: message });
}

if (!query) {
  errorResponse('Missing query parameter');
  process.exit(1);
}

if (!sel) {
  errorResponse(`Unknown engine: ${engine}. Use: ddg, google, bing`);
  process.exit(1);
}

// Clean text: strip private Unicode chars
const cleanText = (s) => s.replace(/[\uE000-\uF8FF\u{F0000}-\u{FFFFF}\u{100000}-\u{10FFFF}]/gu, '').replace(/\s+/g, ' ').trim();

// Eval extraction code
const evalCode = {
  ddg: `(() => {
    const clean = s => s.replace(/[\\uE000-\\uF8FF\\u{F0000}-\\u{FFFFF}\\u{100000}-\\u{10FFFF}]/gu, '').replace(/\\s+/g, ' ').trim();
    const articles = document.querySelectorAll('article');
    const results = [];
    for (const el of articles) {
      const titleA = el.querySelector('a[data-testid="result-title-a"]');
      if (!titleA) continue;
      const title = clean(titleA.innerText || '');
      const link = titleA.href;
      const snippet = clean(el.querySelector('div[data-result="snippet"]')?.innerText || '');
      if (!title) continue;
      if (title.includes('AD') || link?.match(/duckduckgo\\.com\\/.*\\.js/)) continue;
      results.push({ title, link, snippet });
    }
    return results.slice(0, ${count});
  })()`,
  google: `(() => {
    const clean = s => s.replace(/[\\uE000-\\uF8FF\\u{F0000}-\\u{FFFFF}\\u{100000}-\\u{10FFFF}]/gu, '').replace(/\\s+/g, ' ').trim();
    const seen = new Set();
    const containers = document.querySelectorAll('div[data-hveid]');
    const results = [];
    for (const c of containers) {
      const h3 = c.querySelector('h3');
      if (!h3) continue;
      const a = h3.closest('a');
      if (!a) continue;
      if (seen.has(a.href)) continue;
      seen.add(a.href);
      results.push({
        title: clean(h3.innerText || ''),
        link: a.href,
        snippet: clean(c.querySelector('[data-sncf]')?.innerText || ''),
      });
    }
    return results.slice(0, ${count});
  })()`,
  bing: `(() => {
    const clean = s => s.replace(/[\\uE000-\\uF8FF\\u{F0000}-\\u{FFFFF}\\u{100000}-\\u{10FFFF}]/gu, '').replace(/\\s+/g, ' ').trim();
    return [...document.querySelectorAll('li.b_algo')].map(el => ({
      title: clean(el.querySelector('h2')?.innerText || ''),
      link: el.querySelector('h2 a')?.href,
      snippet: clean(el.querySelector('.b_caption p')?.innerText || ''),
    }))
    .filter(r => r.title)
    .slice(0, ${count});
  })()`,
};

try {
  const cdpOptions = noCloak ? {} : { cdpUrl };
  const localOptions = { headless };
  const { browser, source } = noCloak
    ? await connectBrowser(localOptions)
    : await connectBrowser({ ...cdpOptions, ...localOptions });

  console.error(`Connected: ${source === 'cdp' ? 'Stealth server (CDP)' : 'Local Playwright'}`);

  const page = await getPage(browser);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.error(`Searching ${engine}: "${query}"`);

  const waitTimeout = engine === 'ddg' ? 10000 : 20000;
  try {
    await page.waitForSelector(sel.container, { timeout: waitTimeout });
  } catch (e) {
    const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 500) || '');
    const hasCaptcha = bodyText.includes('/sorry/') ||
                       bodyText.includes('solve the challenge') ||
                       bodyText.includes('Select all squares') ||
                       bodyText.includes('captcha') ||
                       bodyText.includes('CAPTCHA');

    if (hasCaptcha) {
      if (source === 'local' || source === 'chrome') {
        console.error('CAPTCHA detected! Please solve it in the browser. Press Enter when done...');
        process.stdin.resume();
        await new Promise(resolve => process.stdin.once('data', resolve));
        await page.waitForSelector(sel.container, { timeout: 20000 });
      } else {
        await closeBrowser(browser, source);
        errorResponse('CAPTCHA detected. Use --no-cloak to open local browser for solving.');
        process.exit(1);
      }
    } else {
      await closeBrowser(browser, source);
      errorResponse('No results found. Page may have changed structure.');
      process.exit(1);
    }
  }

  let results;

  const hasAccessibility = typeof page.accessibility?.snapshot === 'function';

  if (rawSnapshot) {
    if (!hasAccessibility) {
      await closeBrowser(browser, source);
      errorResponse('Accessibility API not available. Use --eval or install Playwright browsers.');
      process.exit(1);
    }
    const snapshot = await page.accessibility.snapshot();
    respond({ success: true, engine, query, rawSnapshot: snapshot });
    await closeBrowser(browser, source);
    process.exit(0);
  } else if (useEval || !hasAccessibility) {
    if (!hasAccessibility && !useEval) {
      console.error('Accessibility API not available, using eval mode...');
    }
    results = await page.evaluate(evalCode[engine]);
  } else {
    console.error('Using snapshot mode...');
    try {
      const snapshot = await page.accessibility.snapshot();
      const yaml = snapshotToYaml(snapshot);
      results = parseSnapshot(yaml, engine, count);
    } catch (e) {
      console.error('Snapshot failed, using eval mode...');
      results = await page.evaluate(evalCode[engine]);
    }
  }

  // Filter ads
  results = results
    .filter(r => !r.title.includes('\nAD'))
    .filter(r => !r.link?.match(/duckduckgo\.com\/.*\.js/));

  respond({ success: true, engine, query, limit: count, results });
  console.error(`Found ${results.length} results`);

  await closeBrowser(browser, source);

} catch (e) {
  errorResponse(e.message);
  process.exit(1);
}
