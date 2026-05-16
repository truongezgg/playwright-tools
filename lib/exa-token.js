/**
 * Exa token manager.
 * Visits exa.ai/search to capture auto-generated JWT token.
 * Caches token in memory for 4 minutes.
 */

const TOKEN_TTL_MS = 4 * 60 * 1000; // 4 min (safety margin vs 5 min actual)

let cachedToken = null;
let cachedAt = 0;

/**
 * Get cached token if still valid.
 * @returns {string|null}
 */
export function getCachedToken() {
  if (cachedToken && Date.now() - cachedAt < TOKEN_TTL_MS) {
    return cachedToken;
  }
  return null;
}

/**
 * Get token by visiting exa.ai/search and capturing the JWT from network.
 * @param {import('playwright-core').Page} page
 * @returns {Promise<string>}
 */
export async function getToken(page) {
  // Check cache first
  const cached = getCachedToken();
  if (cached) {
    console.error('Using cached Exa token');
    return cached;
  }

  console.error('Fetching Exa token...');

  let token = null;

  const tokenPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Exa token capture timeout')), 20000);

    const handler = (req) => {
      const auth = req.headers()['authorization'];
      if (req.url().includes('/api/search') && auth) {
        token = auth.replace('Bearer ', '');
        clearTimeout(timeout);
        page.removeListener('request', handler);
        resolve(token);
      }
    };

    page.on('request', handler);
  });

  // Visit exa search page — it auto-generates a token
  await page.goto('https://exa.ai/search', { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Trigger a search to generate token
  try {
    const input = await page.waitForSelector('input[type="text"], input[type="search"], textarea', { timeout: 5000 });
    await input.fill('test');
    await page.keyboard.press('Enter');
  } catch {
    // Input not found, token might come from page load
  }

  token = await tokenPromise;

  cachedToken = token;
  cachedAt = Date.now();

  return token;
}
