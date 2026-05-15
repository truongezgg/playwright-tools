#!/usr/bin/env node

import { connectBrowser, getPage, closeBrowser } from './lib/browser.js';
import { getConfig } from './lib/config.js';
import TurndownService from 'turndown';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const params = args.filter(a => !a.startsWith('--'));

const url = params[0];

const cdpUrl = flags.find(f => f.startsWith('--cdp='))?.split('=')[1] || getConfig('cdpUrl', 'PT_CDP_URL', 'http://localhost:9222');
const noCloak = flags.includes('--no-cloak');
const useSnapshot = flags.includes('--snapshot');
const rawSnapshot = flags.includes('--rawsnapshot');
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

  const page = await getPage(browser);

  console.error(`Fetching: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

  await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

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

  // DOM extraction
  const extractFn = (sel) => {
    if (sel) {
      // Selector mode - try to find element
      const el = document.querySelector(sel);
      if (el) {
        return {
          html: el.innerHTML,
          text: el.innerText,
        };
      }
      // Selector not found - return null to trigger fallback to full page
      return { found: false, selector: sel };
    }
    // Default: find main content area
    const article = document.querySelector('article');
    const main = document.querySelector('main');
    const contentEl = document.querySelector('.content, .markdown, #content');
    const target = article || main || contentEl || document.body;
    return {
      html: target?.innerHTML || '',
      text: target?.innerText || '',
    };
  };

  const extracted = await page.evaluate(extractFn, selector);

  // If selector was specified but element not found, fallback to full page
  if (selector && !extracted.found) {
    console.error(`Selector "${selector}" not found, using full page`);
    const fallbackFn = () => {
      const article = document.querySelector('article');
      const main = document.querySelector('main');
      const contentEl = document.querySelector('.content, .markdown, #content');
      const target = article || main || contentEl || document.body;
      return {
        html: target?.innerHTML || '',
        text: target?.innerText || '',
      };
    };
    const fallback = await page.evaluate(fallbackFn);
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
