---
name: playwright-tools
description: Use when needing to search the web or fetch pages that WebFetch cannot access (502, 403, blocked). Supports stealth browser via CDP server.
---

# Playwright Tools

CLI tools for web search and page fetching with stealth browser support.

## Commands

| Command | Purpose |
|---------|---------|
| `pt-search` | Search engines (DDG, Google, Bing) |
| `pt-fetch` | Fetch page content |

## Quick Start

```bash
# Search
pt-search ddg "query" 5
pt-search google "query" 10
pt-search bing "query" 3

# Fetch page
pt-fetch https://example.com
pt-fetch https://example.com --snapshot
```

## Modes

### Browser Connection (Priority)

1. **CDP Server** (stealth) — connects to `localhost:9222`
2. **Local Playwright** — fallback, may need CAPTCHA

```bash
# Start stealth server (Docker)
docker-compose up -d

# CLI auto-connects to server
pt-search ddg "query" 5  # Uses stealth server

# Force local browser
pt-search ddg "query" 5 --no-cloak
```

### Data Extraction

| Mode | Flag | Stability | Output |
|------|------|-----------|--------|
| **Default** | (none) | Medium | JSON |
| **Snapshot** | `--snapshot` | High | Structured text |
| **Raw Snapshot** | `--rawsnapshot` | High | YAML tree |
| **Eval** | `--eval` | Low | JSON |

**Default mode:** Uses eval (fast, CSS selectors).
**Snapshot mode:** Uses accessibility tree (stable, semantic structure).

## Options

### pt-search

```
pt-search [engine] [query] [count] [options]

Options:
  --cdp URL       CDP server URL (default: http://localhost:9222)
  --no-cloak      Force local Playwright
  --eval          Use eval mode
  --rawsnapshot   Output raw snapshot YAML
  --headless      Headless mode for local browser
```

### pt-fetch

```
pt-fetch [url] [options]

Options:
  --cdp URL       CDP server URL
  --no-cloak      Force local Playwright
  --snapshot       Output accessibility tree
  --rawsnapshot    Output raw snapshot YAML
  --selector CSS   Extract specific element
  --headless       Headless mode
  --timeout MS     Page load timeout (default: 15000)
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
# Install CLI
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/playwright-tools/main/install.sh | bash

# Optional: Start stealth server
docker-compose up -d
```

## Examples

```bash
# Search with stealth server
pt-search ddg "cloakbrowser" 5

# Fetch page that WebFetch failed
pt-fetch https://docs.ton.org/standard/tokens/jettons/overview

# Get raw snapshot for debugging
pt-search ddg "query" 3 --rawsnapshot

# Force local browser (for CAPTCHA solving)
pt-search google "query" 5 --no-cloak
```
