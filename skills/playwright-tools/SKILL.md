---
name: playwright-tools
description: Use when WebFetch fails (502, 403, blocked) or need to search the web. CLI tools with stealth browser support.
---

# Playwright Tools

CLI tools for web search and page fetching when standard tools fail.

## Commands

```bash
pt search <engine> <query> [count] [options]
pt fetch <url> [options]
pt update
```

## Test Results

| Engine | Headless | Headed | CloakBrowser |
|--------|----------|--------|--------------|
| DuckDuckGo | OK | OK | OK |
| Google | BLOCKED | OK | OK |
| Bing | BLOCKED | OK | OK |

## Quick Start

```bash
# DDG search (headless, fast)
pt search ddg "query" 5

# Google search (headed, CAPTCHA solving)
pt search google "query" 10 --headed

# Fetch page when WebFetch fails
pt fetch https://docs.ton.org/standard/tokens/jettons/overview

# Update
pt update
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--headed` | Visible browser | auto |
| `--headless` | No browser window | auto |
| `--cdp URL` | CDP server | `localhost:9222` |
| `--no-cloak` | Skip CDP | false |
| `--eval` | JavaScript extraction | default |
| `--snapshot` | Accessibility tree | - |
| `--rawsnapshot` | Raw YAML | - |
| `--selector CSS` | Extract element (fetch) | - |
| `--timeout MS` | Load timeout (fetch) | `15000` |

## Stealth Server

```bash
docker compose up -d
pt search google "query" 5  # No CAPTCHA
```

## When to Use

- WebFetch returns 502, 403, or empty
- Site blocks automated requests
- Search engines return CAPTCHA

## When NOT to Use

- WebFetch works fine
- Simple page that doesn't need stealth

## Install

```bash
curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash
```
