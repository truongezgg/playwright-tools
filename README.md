# Playwright Tools

CLI tools for web search and page fetching with stealth browser support.

## Features

- **Stealth browsing** via CDP server (CloakBrowser or any Chromium-based server)
- **Fallback** to local Playwright when server unavailable
- **Snapshot mode** for stable data extraction (accessibility tree)
- **Ad filtering** for search results
- **No vendor lock-in** — works with any CDP-compatible browser server

## Quick Start

```bash
# Install
curl -sSL https://raw.githubusercontent.com/YOUR_USERNAME/playwright-tools/main/install.sh | bash

# Search
pt-search ddg "query" 5
pt-search google "query" 10

# Fetch page
pt-fetch https://example.com
```

## Stealth Server (Optional)

For better stealth (no CAPTCHAs), run a browser server in Docker:

```bash
# Start server
docker-compose up -d

# CLI auto-connects to localhost:9222
pt-search ddg "query" 5

# Force local browser (for CAPTCHA solving)
pt-search ddg "query" 5 --no-cloak
```

## Commands

### pt-search

```bash
pt-search [engine] [query] [count] [options]

Engines: ddg, google, bing

Options:
  --cdp URL       CDP server URL (default: http://localhost:9222)
  --no-cloak      Force local Playwright
  --eval          Use eval mode (fast, CSS selectors)
  --snapshot      Use snapshot mode (stable, accessibility tree)
  --rawsnapshot   Output raw snapshot YAML
  --headless      Headless mode for local browser
```

### pt-fetch

```bash
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

## Architecture

```
┌─────────────────────────────────┐
│  Docker Container               │
│  ┌─────────────────────────┐    │
│  │ Stealth Browser Server  │    │
│  │ (Chromium + stealth)    │    │
│  │ Port 9222 (CDP)         │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
            ▲
            │ CDP connection
            │
┌─────────────────────────────────┐
│  CLI Tools (playwright-tools)   │
│  - pt-search                    │
│  - pt-fetch                     │
│  Fallback: local Playwright     │
└─────────────────────────────────┘
```

## Why This Design?

1. **No vendor lock-in** — CLI only uses `playwright-core`, connects via CDP
2. **Security** — Stealth browser isolated in Docker
3. **Flexibility** — Swap CloakBrowser for any stealth browser server
4. **Fallback** — Works without server (may need CAPTCHA)

## Development

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/playwright-tools.git
cd playwright-tools

# Install
npm install

# Test
npm test
npm run test:unit
npm run test:integration
```

## License

MIT
