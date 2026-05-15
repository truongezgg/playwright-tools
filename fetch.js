#!/usr/bin/env node

import { connectBrowser, getPage, closeBrowser } from './lib/browser.js';

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const params = args.filter(a => !a.startsWith('--'));

const url = params[0];

const cdpUrl = flags.find(f => f.startsWith('--cdp='))?.split('=')[1] || 'http://localhost:9222';
const noCloak = flags.includes('--no-cloak');
const useSnapshot = flags.includes('--snapshot');
const rawSnapshot = flags.includes('--rawsnapshot');
const headless = flags.includes('--headless');
const selector = flags.find(f => f.startsWith('--selector='))?.split('=')[1] || null;
const timeout = parseInt(flags.find(f => f.startsWith('--timeout='))?.split('=')[1]) || 15000;

if (!url) {
  console.error('Usage: pt-fetch <url> [options]');
  console.error('Run "pt-fetch --help" for more info');
  process.exit(1);
}

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
  console.error(`Fetching: ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

  // Wait for content to load
  await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});

  let content;

  // Check if accessibility API is available
  const hasAccessibility = typeof page.accessibility?.snapshot === 'function';

  if (rawSnapshot) {
    // Raw snapshot mode
    if (!hasAccessibility) {
      console.error('Accessibility API not available with this browser. Use a different mode or install Playwright browsers.');
      await closeBrowser(browser, source);
      process.exit(1);
    }
    const snapshot = await page.accessibility.snapshot();
    console.log(JSON.stringify(snapshot, null, 2));
  } else if (useSnapshot) {
    // Snapshot mode
    if (!hasAccessibility) {
      console.error('Accessibility API not available, falling back to page text...');
      content = await page.evaluate(() => document.body?.innerText?.substring(0, 10000) || 'No content');
      console.log(content);
    } else {
      const snapshot = await page.accessibility.snapshot();
      content = extractTextFromSnapshot(snapshot);
      console.log(content);
    }
  } else if (selector) {
    // Selector mode
    content = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.innerText : `Element not found: ${sel}`;
    }, selector);
    console.log(content);
  } else {
    // Default: get page text
    content = await page.evaluate(() => {
      // Try to get main content
      const article = document.querySelector('article');
      const main = document.querySelector('main');
      const content = document.querySelector('.content, .markdown, #content');
      const target = article || main || content || document.body;
      return target?.innerText?.substring(0, 10000) || 'No content found';
    });
    console.log(content);
  }

  await closeBrowser(browser, source);

} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}

/**
 * Extract text from accessibility snapshot.
 */
function extractTextFromSnapshot(node, depth = 0) {
  if (!node) return '';

  let text = '';

  // Add node text
  if (node.name) {
    text += '  '.repeat(depth) + node.name + '\n';
  }

  // Add value if present
  if (node.value) {
    text += '  '.repeat(depth) + `[${node.value}]\n`;
  }

  // Process children
  if (node.children) {
    for (const child of node.children) {
      text += extractTextFromSnapshot(child, depth + 1);
    }
  }

  return text;
}
