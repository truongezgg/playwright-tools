/**
 * Browser connection manager.
 * Connects to CDP server (stealth) or falls back to local Playwright.
 */

import { chromium } from 'playwright-core';
import { execSync } from 'node:child_process';

const DEFAULT_CDP_URL = 'http://localhost:9222';

// Common Chrome paths by platform
const CHROME_PATHS = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ],
};

/**
 * Find Chrome executable path.
 */
function findChromePath() {
  const platform = process.platform;
  const paths = CHROME_PATHS[platform] || [];

  for (const path of paths) {
    try {
      if (platform === 'darwin') {
        execSync(`test -d "${path}"`, { stdio: 'ignore' });
      } else {
        execSync(`test -f "${path}"`, { stdio: 'ignore' });
      }
      return path;
    } catch (e) {
      // Path doesn't exist
    }
  }

  // Try to find via which/where
  try {
    const cmd = platform === 'win32' ? 'where' : 'which';
    return execSync(`${cmd} chrome || ${cmd} google-chrome || ${cmd} chromium`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim().split('\n')[0];
  } catch (e) {
    return null;
  }
}

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

  // Try local Playwright with installed browser
  try {
    const browser = await chromium.launch({ headless });
    return { browser, source: 'local' };
  } catch (e) {
    // No Playwright browser installed
  }

  // Try system Chrome
  const chromePath = findChromePath();
  if (chromePath) {
    try {
      const browser = await chromium.launch({
        executablePath: chromePath,
        headless,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      return { browser, source: 'chrome' };
    } catch (e) {
      // Chrome launch failed
    }
  }

  // Try Chrome without explicit path (macOS app bundle)
  if (process.platform === 'darwin') {
    try {
      const browser = await chromium.launch({
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless,
        args: ['--disable-blink-features=AutomationControlled'],
      });
      return { browser, source: 'chrome' };
    } catch (e) {
      // Chrome launch failed
    }
  }

  throw new Error(
    'No browser available.\n' +
    'Options:\n' +
    '  1. Start stealth server: docker run -d -p 9222:9222 playwright-tools-server\n' +
    '  2. Install Playwright: npx playwright install chromium\n' +
    '  3. Install Chrome: https://www.google.com/chrome/'
  );
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
 * @param {string} source - 'cdp', 'local', or 'chrome'
 */
export async function closeBrowser(browser, source) {
  // All sources use the same close method
  await browser.close();
}
