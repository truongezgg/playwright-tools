/**
 * Browser connection manager.
 * Connects to CDP server (stealth) or falls back to local Playwright.
 */

import { chromium } from 'playwright-core';

const DEFAULT_CDP_URL = 'http://localhost:9222';

/**
 * Connect to browser via CDP or launch local.
 * @param {Object} options
 * @param {string} options.cdpUrl - CDP server URL (default: localhost:9222)
 * @param {boolean} options.headless - Headless mode for local browser (default: false)
 * @returns {Promise<{browser, source}>} - Browser instance and source ('cdp' or 'local')
 */
export async function connectBrowser(options = {}) {
  const cdpUrl = options.cdpUrl || DEFAULT_CDP_URL;
  const headless = options.headless ?? false;

  // Try CDP connection first
  try {
    const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 3000 });
    return { browser, source: 'cdp' };
  } catch (e) {
    // CDP not available, fall back to local
  }

  // Try local Playwright
  try {
    const browser = await chromium.launch({ headless });
    return { browser, source: 'local' };
  } catch (e) {
    throw new Error(
      'No browser available.\n' +
      'Options:\n' +
      '  1. Start stealth server: docker run -d -p 9222:9222 playwright-tools-server\n' +
      '  2. Install Playwright: npx playwright install chromium'
    );
  }
}

/**
 * Get a new page from browser.
 * @param {Object} browser - Playwright browser instance
 * @returns {Promise<Page>}
 */
export async function getPage(browser) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  return context.newPage();
}

/**
 * Close browser (handles both CDP and local).
 * @param {Object} browser - Playwright browser instance
 * @param {string} source - 'cdp' or 'local'
 */
export async function closeBrowser(browser, source) {
  if (source === 'cdp') {
    // CDP: just disconnect, don't close the server
    await browser.close();
  } else {
    // Local: close the browser
    await browser.close();
  }
}
