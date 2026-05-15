# playwright-tools

CLI tools for searching the web and fetching pages when standard HTTP clients fail.

Uses real browsers to bypass bot detection, CAPTCHAs, and JavaScript rendering.

## Install

```bash
curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash
```

This installs:
- **CLI commands:** `pt-search`, `pt-fetch`
- **Agent skill:** `~/.agents/skills/playwright-tools/`

To update:

```bash
pt-update
```

## Commands

### pt-search

```bash
pt-search <engine> <query> [count] [options]
```

| Engine | Headless | Headed | CDP Server |
|--------|----------|--------|------------|
| DuckDuckGo | OK | OK | OK |
| Google | blocked | OK | OK |
| Bing | blocked | OK | OK |

```bash
# DuckDuckGo (headless, fast)
pt-search ddg "seavoca" 5

# Google (headed, user solves CAPTCHA if needed)
pt-search google "next.js security" 10 --headed

# Google (headless — blocked)
pt-search google "query" 5 --headless
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--headed` | Visible browser | auto |
| `--headless` | No browser window | auto |
| `--cdp URL` | CDP server | `localhost:9222` |
| `--no-cloak` | Skip CDP | false |
| `--snapshot` | Accessibility tree extraction | - |
| `--rawsnapshot` | Raw YAML output | - |
| `--eval` | JavaScript extraction | default |

**Default:** DDG = headless, Google/Bing = headed.

### pt-fetch

```bash
pt-fetch <url> [options]
```

```bash
# Page content
pt-fetch https://example.com

# Specific element
pt-fetch https://example.com --selector "article"

# Accessibility tree
pt-fetch https://example.com --snapshot
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--selector CSS` | Extract element | - |
| `--headless` | No browser window | true |
| `--cdp URL` | CDP server | `localhost:9222` |
| `--no-cloak` | Skip CDP | false |
| `--snapshot` | Accessibility tree | - |
| `--rawsnapshot` | Raw YAML | - |
| `--timeout MS` | Load timeout | `15000` |

## Stealth Server

Run CloakBrowser in Docker for Google/Bing without CAPTCHA:

```bash
cd ~/.playwright-tools
docker compose up -d
```

CLI auto-connects to `localhost:9222`. No code changes needed.

```bash
# Now Google works headless
pt-search google "query" 5
```

## How It Works

**Browser priority:**

1. CDP server at `localhost:9222` (stealth, no CAPTCHA)
2. Playwright browser (if installed)
3. System Chrome (auto-detected)

**Extraction modes:**

| Mode | Flag | Stability | Speed |
|------|------|-----------|-------|
| Eval | `--eval` | Low (CSS selectors) | Fast |
| Snapshot | `--snapshot` | High (accessibility tree) | Medium |

```bash
# Default (eval)
pt-search ddg "query" 5

# Stable (snapshot)
pt-search ddg "query" 5 --snapshot

# Debug (raw YAML)
pt-search ddg "query" 5 --rawsnapshot
```

## Why This Exists

| Problem | This tool |
|---------|-----------|
| `WebSearch` rate-limited | Real browser |
| `WebFetch` returns 502/403 | JavaScript rendering |
| Google shows CAPTCHA | CDP stealth server |
| CSS selectors break | Snapshot mode |
| Vendor lock-in | Only `playwright-core`, standard CDP |

## License

MIT
