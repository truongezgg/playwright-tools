# playwright-tools

CLI tools for searching the web and fetching pages when standard HTTP clients fail.

Uses real browsers (Chrome, CloakBrowser) to bypass bot detection, CAPTCHAs, and JavaScript rendering issues.

```bash
npm install -g git+https://github.com/truongezgg/playwright-tools.git
```

## Commands

### pt-search

```bash
pt-search <engine> <query> [count] [options]
```

**Engines:** `ddg` | `google` | `bing`

```bash
# DuckDuckGo (headless, fast)
pt-search ddg "seavoca" 5

# Google (headed, user solves CAPTCHA if needed)
pt-search google "next.js security" 10 --headed

# Google (headless — will be blocked)
pt-search google "query" 5 --headless
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--headed` | Open visible browser | auto (Google/Bing) |
| `--headless` | Run without browser window | auto (DDG) |
| `--cdp URL` | Connect to CDP server | `localhost:9222` |
| `--no-cloak` | Skip CDP, use local browser | false |
| `--eval` | Extract via JavaScript | default |
| `--snapshot` | Extract via accessibility tree | - |
| `--rawsnapshot` | Output raw YAML tree | - |

### pt-fetch

```bash
pt-fetch <url> [options]
```

```bash
# Fetch page content
pt-fetch https://example.com

# Extract specific element
pt-fetch https://example.com --selector "article"

# Accessibility tree
pt-fetch https://example.com --snapshot
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--selector CSS` | Extract specific element | - |
| `--headless` | Run without browser window | true |
| `--cdp URL` | Connect to CDP server | `localhost:9222` |
| `--no-cloak` | Skip CDP, use local browser | false |
| `--snapshot` | Output accessibility tree | - |
| `--rawsnapshot` | Output raw YAML tree | - |
| `--timeout MS` | Page load timeout | `15000` |

## Browser Priority

Commands try browsers in order:

1. **CDP server** at `localhost:9222` (stealth, no CAPTCHA)
2. **Playwright browser** (if installed via `npx playwright install chromium`)
3. **System Chrome** (auto-detected)

No CDP server? Commands still work via system Chrome. Google/Bing will need CAPTCHA solving.

## Stealth Server

Run CloakBrowser in Docker for Google/Bing without CAPTCHA:

```bash
docker compose up -d
```

CLI auto-connects to `localhost:9222`. No code changes needed.

```bash
# Now Google works headless
pt-search google "query" 5
```

Stop server:

```bash
docker compose down
```

## Tested Engines

| Engine | Headless | Headed | CDP Server |
|--------|----------|--------|------------|
| DuckDuckGo | OK | OK | OK |
| Google | blocked | OK | OK |
| Bing | blocked | OK | OK |

**Recommendation:** Use DDG for quick searches. Use Google/Bing with CDP server or `--headed`.

## How Extraction Works

Two modes for getting data from pages:

**Eval mode** (default) — runs JavaScript in page:
- Fast
- Breaks if site changes CSS classes
- Output: JSON

**Snapshot mode** (`--snapshot`) — reads accessibility tree:
- Stable (uses semantic structure: heading, link, generic)
- Survives CSS class changes
- Output: structured text

```bash
# Default (eval)
pt-search ddg "query" 5

# Stable extraction
pt-search ddg "query" 5 --snapshot

# Debug: raw YAML tree
pt-search ddg "query" 5 --rawsnapshot
```

## Install

```bash
# SSH
npm install -g git+ssh://git@github.com:truongezgg/playwright-tools.git

# HTTPS
npm install -g git+https://github.com/truongezgg/playwright-tools.git

# curl
curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash
```

## Update

```bash
npm update -g playwright-tools
```

## Why This Exists

| Problem | This tool |
|---------|-----------|
| `WebSearch` rate-limited | Real browser, not HTTP client |
| `WebFetch` returns 502/403 | JavaScript rendering |
| Google shows CAPTCHA | CDP server with stealth |
| CSS selectors break | Snapshot mode (accessibility tree) |
| Vendor lock-in | Only `playwright-core` dependency, standard CDP |

## File Structure

```
lib/
  browser.js     Browser connection (CDP → Playwright → Chrome)
  snapshot.js    Snapshot parser (DDG, Google, Bing)
search.js        Search CLI
fetch.js         Fetch CLI
test.js          Tests
docker-compose.yml  CloakBrowser server
```

## License

MIT
