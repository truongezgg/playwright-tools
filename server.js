#!/usr/bin/env node

/**
 * CloakBrowser server - runs locally without Docker.
 *
 * Usage:
 *   node server.js [port]
 *
 * Default port: 9222
 */

import { launch } from 'cloakbrowser';
import { execSync } from 'node:child_process';

const port = parseInt(process.argv[2]) || 9222;

console.log(`Starting CloakBrowser server on port ${port}...`);

try {
  const browser = await launch({
    headless: true,
    humanize: true,
    args: [
      `--remote-debugging-port=${port}`,
      '--remote-debugging-address=0.0.0.0',
    ],
  });

  console.log(`CloakBrowser server running on http://localhost:${port}`);
  console.log('Press Ctrl+C to stop');

  // Keep alive
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await browser.close();
    process.exit(0);
  });

  // Prevent exit
  await new Promise(() => {});
} catch (e) {
  console.error('Failed to start CloakBrowser:', e.message);
  console.error('\nInstall: npm install cloakbrowser');
  process.exit(1);
}
