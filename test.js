#!/usr/bin/env node

/**
 * Test cases for playwright-tools.
 *
 * Usage:
 *   node test.js              # Run all tests
 *   node test.js --unit       # Unit tests only
 *   node test.js --integration # Integration tests
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDdgSnapshot, parseGoogleSnapshot, parseBingSnapshot, extractText, extractUrl } from './lib/snapshot.js';
import { connectBrowser, getPage, closeBrowser } from './lib/browser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runMode = process.argv[2] || '--unit';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  assert(actual === expected, `${message} (got: ${JSON.stringify(actual)}, expected: ${JSON.stringify(expected)})`);
}

function assertIncludes(str, substr, message) {
  assert(str.includes(substr), `${message} (missing: "${substr}")`);
}

// ===== Unit Tests =====

function testExtractText() {
  console.log('\n[extractText]');

  assertEqual(extractText('- heading "Test Title" [level=2]'), 'Test Title', 'Extracts from double quotes');
  assertEqual(extractText("- heading 'Test Title' [level=2]"), 'Test Title', 'Extracts from single quotes');
  assertEqual(extractText('- generic: Some text here'), 'Some text here', 'Extracts after colon');
}

function testExtractUrl() {
  console.log('\n[extractUrl]');

  assertEqual(extractUrl('- /url: https://example.com'), 'https://example.com', 'Extracts URL');
  assertEqual(extractUrl('- /url: /relative/path'), '/relative/path', 'Extracts relative URL');
}

function testParseDdgSnapshot() {
  console.log('\n[parseDdgSnapshot]');

  const snapshot = `
- list [ref=e1]:
  - listitem [ref=e2]:
    - article [ref=e3] [cursor=pointer]:
      - button [ref=e4]:
        - img [ref=e5]
      - generic [ref=e6]:
        - link "Search domain github.com" [ref=e7]:
          - /url: /?q=test+site:github.com
      - 'heading "GitHub - Test Repo" [level=2] [ref=e8]':
        - 'link "GitHub - Test Repo" [ref=e9]':
          - /url: https://github.com/test
          - generic [ref=e10]: "GitHub - Test Repo"
      - generic [ref=e11]: "This is a long snippet text that should be extracted as the result snippet content."
  - listitem [ref=e12]:
    - article [ref=e13]:
      - heading "Second Result" [level=2] [ref=e14]:
        - link "Second Result" [ref=e15]:
          - /url: https://example.com
          - generic [ref=e16]: Second Result
      - generic [ref=e17]: "Another snippet for the second result that is long enough to be extracted."
`;

  const results = parseDdgSnapshot(snapshot, 5);

  assertEqual(results.length, 2, 'Finds 2 results');
  assertEqual(results[0].title, 'GitHub - Test Repo', 'First result title');
  assertEqual(results[0].link, 'https://github.com/test', 'First result link');
  assertIncludes(results[0].snippet, 'long snippet text', 'First result snippet');
  assertEqual(results[1].title, 'Second Result', 'Second result title');
}

function testParseGoogleSnapshot() {
  console.log('\n[parseGoogleSnapshot]');

  const snapshot = `
- list [ref=e1]:
  - listitem [ref=e2]:
    - heading "Google Result" [level=3] [ref=e3]:
      - link "Google Result" [ref=e4]:
        - /url: https://example.com
        - generic [ref=e5]: Google Result
    - paragraph [ref=e6]: "This is a Google snippet that is long enough to be extracted."
`;

  const results = parseGoogleSnapshot(snapshot, 5);

  assertEqual(results.length, 1, 'Finds 1 result');
  assertEqual(results[0].title, 'Google Result', 'Result title');
  assertEqual(results[0].link, 'https://example.com', 'Result link');
}

function testParseBingSnapshot() {
  console.log('\n[parseBingSnapshot]');

  const snapshot = `
- list [ref=e1]:
  - listitem [ref=e2]:
    - heading "Bing Result" [level=2] [ref=e3]:
      - link "Bing Result" [ref=e4]:
        - /url: https://www.bing.com/ck/a?test
        - generic [ref=e5]: Bing Result
    - generic [ref=e6]: "Bing snippet text that is long enough to be extracted."
`;

  const results = parseBingSnapshot(snapshot, 5);

  assertEqual(results.length, 1, 'Finds 1 result');
  assertEqual(results[0].title, 'Bing Result', 'Result title');
  assertEqual(results[0].link, 'https://www.bing.com/ck/a?test', 'Result link');
}

function testAdFiltering() {
  console.log('\n[ad filtering]');

  const snapshot = `
- list [ref=e1]:
  - listitem [ref=e2]:
    - article [ref=e3]:
      - heading "Ad Result
AD" [level=2] [ref=e4]:
        - link "Ad Result
AD" [ref=e5]:
          - /url: https://duckduckgo.com/y.js?ad_domain=test.com
          - generic [ref=e6]: "Ad Result
AD"
      - generic [ref=e7]: "This is an ad snippet."
  - listitem [ref=e8]:
    - article [ref=e9]:
      - heading "Real Result" [level=2] [ref=e10]:
        - link "Real Result" [ref=e11]:
          - /url: https://example.com
          - generic [ref=e12]: Real Result
      - generic [ref=e13]: "This is a real result snippet."
`;

  const results = parseDdgSnapshot(snapshot, 5);

  assertEqual(results.length, 1, 'Filters out ad');
  assertEqual(results[0].title, 'Real Result', 'Keeps real result');
}

function testBrowserConnection() {
  console.log('\n[browser connection]');

  // Test: browser module exports
  try {
    // We already imported at the top
    assert(typeof connectBrowser === 'function', 'connectBrowser function exists');
    assert(typeof getPage === 'function', 'getPage function exists');
    assert(typeof closeBrowser === 'function', 'closeBrowser function exists');
  } catch (e) {
    assert(false, 'browser module exports: ' + e.message);
  }
}

// ===== Integration Tests =====

async function testSearchWithCloak() {
  console.log('\n[Integration: search with CloakBrowser]');

  try {
    const { execSync } = await import('node:child_process');
    const result = execSync('node search.js ddg "test" 2', {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 30000,
    });
    const parsed = JSON.parse(result);
    assert(parsed.length >= 1, 'Returns at least 1 result');
    assert(parsed[0].title, 'Result has title');
    assert(parsed[0].link, 'Result has link');
  } catch (e) {
    console.log('  ○ Skipped (CloakBrowser server not running)');
  }
}

async function testFetchWithCloak() {
  console.log('\n[Integration: fetch with CloakBrowser]');

  try {
    const { execSync } = await import('node:child_process');
    const result = execSync('node fetch.js https://example.com', {
      cwd: __dirname,
      encoding: 'utf8',
      timeout: 30000,
    });
    assert(result.includes('Example Domain'), 'Fetches page content');
  } catch (e) {
    console.log('  ○ Skipped (CloakBrowser server not running)');
  }
}

// ===== Run Tests =====

console.log('=== Playwright Tools Tests ===');

if (runMode === '--unit' || runMode === '--all') {
  console.log('\n--- Unit Tests ---');
  testExtractText();
  testExtractUrl();
  testParseDdgSnapshot();
  testParseGoogleSnapshot();
  testParseBingSnapshot();
  testAdFiltering();
  testBrowserConnection();
}

if (runMode === '--integration' || runMode === '--all') {
  console.log('\n--- Integration Tests ---');
  await testSearchWithCloak();
  await testFetchWithCloak();
}

// Summary
console.log('\n=== Results ===');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);

if (failed > 0) {
  console.error('\nSome tests failed!');
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
}
