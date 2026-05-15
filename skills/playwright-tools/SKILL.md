---
name: playwright-tools
description: Use when WebFetch fails (502, 403, blocked) or need to search the web. CLI tools with stealth browser support.
---

# Playwright Tools

CLI tools for web search and page fetching when standard tools fail.

## Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `pt-search` | Search DDG, Google, Bing | `pt-search ddg "query" 5` |
| `pt-fetch` | Fetch page content | `pt-fetch https://example.com` |

## Test Results

| Engine | Headless | Headed | CloakBrowser |
|--------|----------|--------|--------------|
| DuckDuckGo | OK | OK | OK |
| Google | BLOCKED | OK | OK |
| Bing | BLOCKED | OK | OK |
| Fetch pages | OK | OK | OK |

## Quick Start

```bash
# DDG search (headless, fast, no CAPTCHA)
pt-search ddg "query" 5

# Google search (headed, 20s timeout for CAPTCHA)
pt-search google "query" 10 --headed

# Google headless (will be blocked, but fast)
pt-search google "query" 5 --headless

# Fetch page when WebFetch fails
pt-fetch https://docs.ton.org/standard/tokens/jettons/overview
```

## Options

### pt-search

```
pt-search [engine] [query] [count] [options]

Engines: ddg, google, bing

Options:
  --cdp URL       CDP server URL (default: http://localhost:9222)
  --no-cloak      Force local browser (no CDP)
  --eval          Use eval mode (fast, CSS selectors)
  --rawsnapshot   Output raw snapshot YAML
  --headless      Force headless mode
  --headed        Force headed mode (for CAPTCHA solving)
```

**Default mode:** DDG = headless, Google/Bing = headed (they block headless)

### pt-fetch

```
pt-fetch [url] [options]

Options:
  --cdp URL       CDP server URL
  --no-cloak      Force local browser
  --snapshot       Output accessibility tree
  --rawsnapshot    Output raw snapshot YAML
  --selector CSS   Extract specific element
  --headless       Headless mode
  --timeout MS     Page load timeout (default: 15000)
```

## Stealth Server (Optional)

For Google/Bing without CAPTCHA, run CloakBrowser server:

```bash
# Docker (recommended)
docker compose up -d

# CLI auto-connects to localhost:9222
pt-search google "query" 5  # No CAPTCHA needed
```

## When to Use

- WebFetch returns 502, 403, or empty
- Site blocks automated requests
- Need JavaScript-rendered content
- Search engines return CAPTCHA

## When NOT to Use

- WebFetch works fine
- User provides specific URL that works
- Simple page that doesn't need stealth

## Installation

```bash
# npm global install
npm install -g git+ssh://git@github.com:truongezgg/playwright-tools.git

# or via HTTPS
npm install -g git+https://github.com/truongezgg/playwright-tools.git
```

## Examples

```bash
# Quick DDG search (headless, fast)
pt-search ddg "cloakbrowser" 5

# Google search (headed, user solves CAPTCHA if needed)
pt-search google "next.js security" 10 --headed

# Google headless (will be blocked, but fast)
pt-search google "query" 5 --headless

# Fetch page that WebFetch failed
pt-fetch https://docs.ton.org/standard/tokens/jettons/overview

# Search Google with stealth server (no CAPTCHA)
docker compose up -d
pt-search google "next.js security" 10
```
