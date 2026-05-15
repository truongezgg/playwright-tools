#!/usr/bin/env node

/**
 * Playwright Tools — single CLI entry point
 *
 * Usage:
 *   pt search <engine> <query> [count] [options]
 *   pt fetch <url> [options]
 *   pt update
 *   pt --help
 *   pt --version
 */

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const args = process.argv.slice(2);
const command = args[0];

// No command or --help
if (!command || command === '--help' || command === '-h' || command === 'help') {
  console.log(`
pt — Playwright Tools

Usage:
  pt <command> [options]

Commands:
  search <engine> <query> [count]   Search the web
  fetch <url> [options]             Fetch page content
  update                            Update playwright-tools
  config                            Show config
  config init                       Create default config

Search Engines:
  ddg        DuckDuckGo (headless by default)
  google     Google (headed by default)
  bing       Bing (headed by default)

Search Options:
  --headed        Visible browser (for CAPTCHA solving)
  --headless      No browser window
  --cdp URL       CDP server URL (default: http://localhost:9222)
  --no-cloak      Skip CDP, use local browser
  --eval          JavaScript extraction (default)
  --snapshot      Accessibility tree (local browser only)
  --rawsnapshot   Raw YAML output

Fetch Options:
  --selector CSS   Extract specific element
  --snapshot       Accessibility tree extraction
  --rawsnapshot    Raw YAML output
  --headless       No browser window (default)
  --cdp URL        CDP server URL (default: http://localhost:9222)
  --no-cloak       Skip CDP, use local browser
  --timeout MS     Page load timeout (default: 15000)

Examples:
  pt search ddg "query" 5
  pt search google "query" 10 --headed
  pt fetch https://example.com
  pt fetch https://example.com --selector "article"
  pt update
`);
  process.exit(0);
}

// --version
if (command === '--version' || command === '-v' || command === 'version') {
  console.log(`${pkg.name} v${pkg.version}`);
  process.exit(0);
}

// Handle config command
if (command === 'config') {
  const { loadConfig } = await import('../lib/config.js');
  const config = loadConfig();
  if (args[1] === 'init') {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { homedir } = await import('node:os');
    const dir = join(homedir(), '.playwright-tools');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify({ cdpUrl: 'http://localhost:9222' }, null, 2));
    console.log(`Config created: ${path}`);
  } else {
    console.log(JSON.stringify(config, null, 2) || 'No config found. Run "pt config init" to create one.');
  }
  process.exit(0);
}

// Dispatch to subcommands
const subcommands = {
  search: () => import('../search.js'),
  fetch: () => import('../fetch.js'),
  update: () => {
    try {
      execSync(`bash "${join(__dirname, '..', 'update.sh')}"`, { stdio: 'inherit' });
    } catch (e) {
      process.exit(1);
    }
    process.exit(0);
  },
};

if (subcommands[command]) {
  if (command === 'update') {
    subcommands[command]();
  } else {
    // Set argv for subcommand: strip 'pt' and command
    process.argv = [process.argv[0], process.argv[1], ...args.slice(1)];
    await subcommands[command]();
  }
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "pt --help" for available commands');
  process.exit(1);
}
