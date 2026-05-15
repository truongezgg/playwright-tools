# Playwright Tools

CLI tools for searching the web and fetching pages when standard tools fail.

## What's Included

| Tool | Purpose | Example |
|------|---------|---------|
| `pt-search` | Search engines (DDG, Google, Bing) | `pt-search ddg "query" 5` |
| `pt-fetch` | Fetch page content | `pt-fetch https://example.com` |

## Why This Exists

| Problem | Solution |
|---------|----------|
| `WebSearch` returns 429/rate-limited | `pt-search` uses real browser |
| `WebFetch` returns 502, 403, empty | `pt-fetch` renders JavaScript |
| Search engines show CAPTCHA | CloakBrowser stealth server |
| CSS selectors break when site changes | Snapshot mode uses accessibility tree |
| Vendor lock-in | Only depends on `playwright-core`, connects via standard CDP |

## Abilities

| Feature | Description |
|---------|-------------|
| **Stealth mode** | Connect to any CDP server (CloakBrowser, Puppeteer, etc.) |
| **Auto fallback** | CDP server → Playwright browser → System Chrome |
| **Headed/Headless** | Auto-select based on engine (DDG=headless, Google/Bing=headed) |
| **CAPTCHA handling** | Detects CAPTCHA, waits for user to solve |
| **Snapshot extraction** | Stable parsing via accessibility tree |
| **Ad filtering** | Removes DDG ads from results |
| **Multi-engine** | DuckDuckGo, Google, Bing |

## Test Results

| Engine | Headless | Headed | CloakBrowser |
|--------|----------|--------|--------------|
| DuckDuckGo | OK | OK | OK |
| Google | BLOCKED | OK | OK |
| Bing | BLOCKED | OK | OK |
| Fetch pages | OK | OK | OK |

## Quick Start

### Install

```bash
# npm global (recommended)
npm install -g git+ssh://git@github.com:truongezgg/playwright-tools.git

# npm via HTTPS
npm install -g git+https://github.com/truongezgg/playwright-tools.git

# curl installer
curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash
```

### Update

```bash
npm update -g playwright-tools
```

### Usage

```bash
# Quick search (DDG, headless, fast)
pt-search ddg "query" 5

# Google search (headed, 20s timeout for CAPTCHA)
pt-search google "query" 10 --headed

# Google headless (will be blocked, but fast)
pt-search google "query" 5 --headless

# Fetch page that WebFetch failed
pt-fetch https://docs.ton.org/standard/tokens/jettons/overview
```

## Stealth Server (Optional)

For Google/Bing without CAPTCHA, run CloakBrowser server via Docker.

> **Security Note:** CloakBrowser is open-source. Docker recommended for isolation.

```bash
# Start server
docker compose up -d

# CLI auto-connects to localhost:9222
pt-search ddg "query" 5
pt-search google "query" 5
pt-fetch https://example.com

# Stop server
docker compose down
```

## How It Works

### Browser Connection Priority

```
1. CDP Server (localhost:9222)  →  Stealth mode, no CAPTCHA
2. Playwright browser           →  If installed via npx playwright install
3. System Chrome                →  Auto-detected from standard paths
```

### Search Engine Behavior

| Engine | Headless | Headed | Why |
|--------|----------|--------|-----|
| DuckDuckGo | OK | OK | Less aggressive bot detection |
| Google | BLOCKED | OK | Detects headless Chrome fingerprint |
| Bing | BLOCKED | OK | Similar to Google |

**Auto mode:** DDG runs headless (fast), Google/Bing runs headed (CAPTCHA solving).

### CAPTCHA Flow

```
1. Browser opens in headed mode
2. CAPTCHA detected → message in terminal
3. User solves CAPTCHA in browser
4. Press Enter in terminal
5. Results extracted (20s timeout)
```

### Data Extraction

| Mode | Flag | Stability | Speed |
|------|------|-----------|-------|
| Eval | `--eval` | Low (CSS selectors) | Fast |
| Snapshot | `--snapshot` | High (accessibility tree) | Medium |
| Raw Snapshot | `--rawsnapshot` | High | Medium |

Default: eval. Use `--snapshot` when selectors break.

## Commands

### pt-search

```bash
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

**Examples:**
```bash
pt-search ddg "next.js" 5                    # DDG headless (default)
pt-search google "next.js" 10 --headed       # Google headed, 20s timeout
pt-search bing "query" 3 --headless          # Bing headless (will be blocked)
pt-search ddg "query" 5 --rawsnapshot        # Raw YAML for debugging
```

### pt-fetch

```bash
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

**Examples:**
```bash
pt-fetch https://example.com                        # Page text
pt-fetch https://example.com --selector "article"   # Specific element
pt-fetch https://example.com --snapshot             # Accessibility tree
```

## Architecture

```
┌─────────────────────────────────┐
│  Docker Container               │
│  ┌─────────────────────────┐    │
│  │ CloakBrowser            │    │
│  │ - Stealth Chromium      │    │
│  │ - Humanized behavior    │    │
│  │ - CDP server :9222      │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
            ▲
            │ CDP (Chrome DevTools Protocol)
            │
┌─────────────────────────────────┐
│  CLI Tools                      │
│  - playwright-core (only dep)   │
│  - No CloakBrowser dependency   │
│  - Connects via standard CDP    │
└─────────────────────────────────┘
```

## File Structure

```
playwright-tools/
├── lib/
│   ├── browser.js      # Browser connection (CDP → Playwright → Chrome)
│   └── snapshot.js     # Snapshot parser (DDG, Google, Bing)
├── search.js           # Search CLI
├── fetch.js            # Fetch CLI
├── test.js             # Unit tests (21 tests)
├── install.sh          # curl installer
├── docker-compose.yml  # CloakBrowser server
├── package.json        # Only depends on playwright-core
└── skills/
    └── playwright-tools/
        └── SKILL.md    # Agent skill documentation
```

## Development

```bash
git clone https://github.com/truongezgg/playwright-tools.git
cd playwright-tools
npm install
npm test
```

## License

MIT
