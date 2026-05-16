#!/usr/bin/env node

import { connectBrowser, getPage, closeBrowser } from './lib/browser.js';
import { getConfig } from './lib/config.js';
import { looksLikeBotChallenge } from './lib/bot-detection.js';
import TurndownService from 'turndown';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const params = args.filter(a => !a.startsWith('--'));

const url = params[0];

const cdpUrl = flags.find(f => f.startsWith('--cdp='))?.split('=')[1] || getConfig('cdpUrl', 'PT_CDP_URL', 'http://localhost:9222');
const noCloak = flags.includes('--no-cloak');
const useSnapshot = flags.includes('--snapshot');
const rawSnapshot = flags.includes('--rawsnapshot');
const verbose = flags.includes('--verbose');
const headless = flags.includes('--headless');
const selector = flags.find(f => f.startsWith('--selector='))?.split('=')[1] || null;
const timeout = parseInt(flags.find(f => f.startsWith('--timeout='))?.split('=')[1]) || 15000;
const format = flags.find(f => f.startsWith('--format='))?.split('=')[1] || 'markdown';

// Turndown for HTML→Markdown
const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});
turndown.remove(['script', 'style', 'meta', 'link']);

if (!url) {
  console.error('Usage: pt fetch <url> [options]');
  console.error('Run "pt --help" for more info');
  process.exit(1);
}

// Suppress debug logs unless --verbose
if (!verbose) console.error = () => {};

// Response helper (matches OpenCode webfetch format)
function respond(output, metadata = {}) {
  console.log(JSON.stringify({ output, title: url, metadata }, null, 2));
}

function errorResponse(message) {
  console.log(JSON.stringify({ output: `Error: ${message}`, title: url, metadata: { error: true } }, null, 2));
}

try {
  const cdpOptions = noCloak ? {} : { cdpUrl };
  const localOptions = { headless };
  const { browser, source } = noCloak
    ? await connectBrowser(localOptions)
    : await connectBrowser({ ...cdpOptions, ...localOptions });

  console.error(`Connected: ${source === 'cdp' ? 'Stealth server (CDP)' : 'Local Playwright'}`);

  const page = await getPage(browser, source);

  console.error(`Fetching: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

  await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

  // Bot challenge detection — check before extracting content
  const bodyText = await page.evaluate(() => document.body?.innerText?.substring(0, 2000) || '');
  if (looksLikeBotChallenge(bodyText)) {
    await closeBrowser(browser, source);
    errorResponse('Bot challenge or CAPTCHA detected. Site may be blocking automated access. Try --no-cloak for local browser.');
    process.exit(1);
  }

  const hasAccessibility = typeof page.accessibility?.snapshot === 'function';

  // Raw snapshot mode (always JSON, no format)
  if (rawSnapshot) {
    if (!hasAccessibility) {
      await closeBrowser(browser, source);
      errorResponse('Accessibility API not available. Use --no-cloak or install Playwright browsers.');
      process.exit(1);
    }
    const snapshot = await page.accessibility.snapshot();
    respond(JSON.stringify(snapshot, null, 2), { format: 'rawsnapshot' });
    await closeBrowser(browser, source);
    process.exit(0);
  }

  // Snapshot mode (only for text format)
  if (useSnapshot && format === 'text') {
    if (!hasAccessibility) {
      console.error('Accessibility API not available, falling back to DOM extraction...');
    } else {
      const snapshot = await page.accessibility.snapshot();
      const content = extractTextFromSnapshot(snapshot);
      respond(content, { format: 'text', method: 'snapshot' });
      await closeBrowser(browser, source);
      process.exit(0);
    }
  }

  // DOM extraction with multi-selector cascade and minimum content length
  const SELECTORS = [
    'article',
    'main',
    '[role="main"]',
    '.markdown-body',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    '.markdown',
    '#content',
  ];
  const MIN_CONTENT_LENGTH = 120;

  const extractFn = (customSel, selectors, minLen) => {
    if (customSel) {
      const el = document.querySelector(customSel);
      if (el) {
        return { html: el.innerHTML, text: el.innerText };
      }
      return { found: false, selector: customSel };
    }

    // Cascade through selectors, skip empty/short containers
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el.innerText || '').trim();
        if (text.length >= minLen) {
          return { html: el.innerHTML, text };
        }
      }
    }

    // Fallback: body
    const body = document.body;
    const bodyText = (body?.innerText || '').trim();

    // SPA fallback: title + meta description
    if (bodyText.length < minLen) {
      const title = document.title || '';
      const meta = document.querySelector('meta[name="description"]')?.content || '';
      const ogDesc = document.querySelector('meta[property="og:description"]')?.content || '';
      const desc = meta || ogDesc;
      if (title || desc) {
        return { html: `<h1>${title}</h1><p>${desc}</p>`, text: [title, desc].filter(Boolean).join('\n\n'), spa: true };
      }
    }

    return { html: body?.innerHTML || '', text: bodyText };
  };

  const extracted = await page.evaluate(extractFn, selector, SELECTORS, MIN_CONTENT_LENGTH);

  // If selector was specified but element not found, fallback to cascade
  if (selector && !extracted.found) {
    console.error(`Selector "${selector}" not found, using cascade fallback`);
    const fallback = await page.evaluate(extractFn, null, SELECTORS, MIN_CONTENT_LENGTH);
    extracted.html = fallback.html;
    extracted.text = fallback.text;
  }

  let content;
  switch (format) {
    case 'html':
      content = extracted.html.substring(0, 50000);
      break;
    case 'markdown':
      content = turndown.turndown(extracted.html).substring(0, 50000);
      break;
    case 'text':
    default:
      content = extracted.text.substring(0, 10000);
      break;
  }

  respond(content, { format });

  await closeBrowser(browser, source);

} catch (e) {
  errorResponse(e.message);
  process.exit(1);
}

/**
 * Extract text from accessibility snapshot.
 */
function extractTextFromSnapshot(node, depth = 0) {
  if (!node) return '';

  let text = '';

  if (node.name) {
    text += '  '.repeat(depth) + node.name + '\n';
  }

  if (node.value) {
    text += '  '.repeat(depth) + `[${node.value}]\n`;
  }

  if (node.children) {
    for (const child of node.children) {
      text += extractTextFromSnapshot(child, depth + 1);
    }
  }

  return text;
}
