# Playwright Tools

CLI tools for web search and page fetching with stealth browser support.

## Features

- **Stealth browsing** via CDP server (CloakBrowser or any Chromium-based server)
- **Fallback** to local Playwright when server unavailable
- **Snapshot mode** for stable data extraction (accessibility tree)
- **Ad filtering** for search results
- **No vendor lock-in** — works with any CDP-compatible browser server

## Test Results (Verified)

| Engine | Headless | Headed | CloakBrowser |
|--------|----------|--------|--------------|
| DuckDuckGo | OK | OK | OK |
| Google | BLOCKED | OK | OK |
| Bing | BLOCKED | OK | OK |
| Fetch pages | OK | OK | OK |

- **Headless**: System Chrome, no visible browser
- **Headed**: System Chrome, visible browser (user can solve CAPTCHA)
- **CloakBrowser**: Stealth server via Docker

**Recommendations:**
- DDG: Use headless (fast, no interaction)
- Google/Bing: Use CloakBrowser or headed mode
- Fetch: Headless works for most sites

## Quick Start

### Install

```bash
# Option 1: npm global install (recommended)
npm install -g git+ssh://git@github.com:truongezgg/playwright-tools.git

# Option 2: npm via HTTPS
npm install -g git+https://github.com/truongezgg/playwright-tools.git

# Option 3: curl installer
curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash
```

### Update

```bash
npm update -g playwright-tools
```

### Usage

```bash
# Search
pt-search ddg "query" 5
pt-search google "query" 10

# Fetch page
pt-fetch https://example.com
```

## How It Works

### Browser Connection Priority

When you run a command, it tries browsers in this order:

```
1. CDP Server (localhost:9222)  →  Stealth mode, no CAPTCHA
2. Playwright browser           →  If installed via npx playwright install
3. System Chrome                →  Auto-detected from standard paths
```

**Example flow:**
```bash
pt-search ddg "query" 5

# 1. Try connect to localhost:9222 (CloakBrowser server)
#    → If running: use it (stealth, no CAPTCHA)
#    → If not running: continue

# 2. Try Playwright browser
#    → If installed: use it
#    → If not installed: continue

# 3. Try system Chrome
#    → Found: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
#    → Use it (may need CAPTCHA for Google/Bing)
```

### Search Engine Behavior

Each engine has different blocking behavior:

| Engine | Headless | Headed | Why |
|--------|----------|--------|-----|
| DuckDuckGo | OK | OK | Less aggressive bot detection |
| Google | BLOCKED | OK | Detects headless Chrome fingerprint |
| Bing | BLOCKED | OK | Similar to Google |

**Auto mode selection:**
- DDG → Runs headless (fast, no browser window)
- Google/Bing → Runs headed (opens browser, user can solve CAPTCHA)

**Override:**
```bash
pt-search google "query" 5 --headless   # Force headless (will be blocked)
pt-search ddg "query" 5 --headed        # Force headed (unnecessary but works)
```

### CAPTCHA Handling

When Google/Bing show CAPTCHA:

```
1. Browser opens in headed mode
2. CAPTCHA detected → message shown in terminal
3. User solves CAPTCHA in browser window
4. Press Enter in terminal
5. Results extracted (20s timeout)
```

**With CloakBrowser server:**
- No CAPTCHA appears (stealth fingerprint)
- Runs headless (no browser window)

### Data Extraction Methods

Two ways to extract data from pages:

#### 1. Eval Mode (Default)

Runs JavaScript in page context:

```javascript
// Extract search results
document.querySelectorAll('article').forEach(el => ({
  title: el.querySelector('h2')?.innerText,
  link: el.querySelector('h2 a')?.href,
}))
```

- **Fast** — direct DOM access
- **Fragile** — breaks if CSS selectors change
- **Output** — JSON

#### 2. Snapshot Mode

Reads accessibility tree (semantic structure):

```yaml
- article:
  - heading "Title" [level=2]:
    - link "https://...":
  - generic: "Snippet text..."
```

- **Stable** — uses semantic structure, not CSS classes
- **Slower** — extra step to get tree
- **Output** — structured text or YAML

**Use snapshot when:**
- CSS selectors break
- Site changes layout frequently
- Need stable extraction

```bash
pt-search ddg "query" 5 --snapshot      # Parsed snapshot
pt-search ddg "query" 5 --rawsnapshot   # Raw YAML tree
```

### Ad Filtering

DDG search results include ads. We filter them out:

**Detection:**
- Title contains `\nAD`
- Link matches `duckduckgo.com/*.js` (ad redirect)

**Filtered:**
```json
{
  "title": "Ad Result\nAD",
  "link": "https://duckduckgo.com/y.js?ad_domain=..."
}
```

**Kept:**
```json
{
  "title": "Real Result",
  "link": "https://example.com"
}
```

### Snapshot Parser

For DDG, we parse the accessibility tree to extract results:

```
article
├── heading [level=2] → Title
│   └── link → URL
└── generic → Snippet
```

Parser handles:
- Quoted titles (single/double quotes)
- Nested link structures
- Snippet detection (first long text > 30 chars)
- Ad filtering

## Stealth Server

### Why Use It?

| Without Server | With Server |
|----------------|-------------|
| Google/Bing blocked (headless) | All engines work |
| May need CAPTCHA solving | No CAPTCHA |
| Browser window opens | Headless, no window |

### How It Works

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
│  - Connects via CDP             │
│  - No CloakBrowser dependency   │
└─────────────────────────────────┘
```

**Key insight:** CLI tools don't depend on CloakBrowser. They connect via standard CDP protocol. You can swap CloakBrowser for any stealth browser server.

### Setup

```bash
# Start server
docker compose up -d

# Verify
curl http://localhost:9222/json/version

# Stop
docker compose down
```

### Security

- CloakBrowser is open-source — use at your own risk
- Docker provides isolation from host system
- CLI tools have no CloakBrowser dependency

## Commands Reference

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

Default: DDG=headless, Google/Bing=headed
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
# Clone
git clone https://github.com/truongezgg/playwright-tools.git
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
