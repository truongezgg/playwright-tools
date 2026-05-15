# playwright-tools

CLI tools for searching the web and fetching pages when standard HTTP clients fail.

Uses real browsers to bypass bot detection, CAPTCHAs, and JavaScript rendering.

## Install

**Step 1 — CLI tools:**

```bash
curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash
```

Or via npm:

```bash
npm install -g git+https://github.com/truongezgg/playwright-tools.git
```

**Step 2 — Add skill (optional):**

```bash
npx skills add https://github.com/truongezgg/playwright-tools
```

**Step 3 — Stealth server (optional):**

For Google/Bing without CAPTCHA, run [CloakBrowser](https://github.com/CloakHQ/cloakbrowser) in Docker:

```bash
docker run -d -p 9222:9222 cloakhq/cloakbrowser cloakserve
```

## Usage

```bash
pt search ddg "reactjs" 5
pt search google "next.js" 10 --headed
pt fetch https://example.com
pt update
```

## Commands

| Command                              | Description              |
| ------------------------------------ | ------------------------ |
| `pt search <engine> <query> [count]` | Search DDG, Google, Bing |
| `pt fetch <url>`                     | Fetch page content       |
| `pt update`                          | Update to latest version |
| `pt --help`                          | Show help                |
| `pt --version`                       | Show version             |

### Search Engines

| Engine     | Headless | Headed | CDP Server |
| ---------- | -------- | ------ | ---------- |
| DuckDuckGo | OK       | OK     | OK         |
| Google     | blocked  | OK     | OK         |
| Bing       | blocked  | OK     | OK         |

```bash
pt search ddg "query" 5              # Headless, fast
pt search google "query" 10 --headed # Headed, CAPTCHA solving
pt search bing "query" 3 --snapshot  # Stable extraction
```

### Fetch

```bash
pt fetch https://example.com
pt fetch https://example.com --selector "article"
pt fetch https://example.com --snapshot
```

## Options

| Flag             | Description             | Default          |
| ---------------- | ----------------------- | ---------------- |
| `--headed`       | Visible browser         | auto             |
| `--headless`     | No browser window       | auto             |
| `--cdp URL`      | CDP server              | `localhost:9222` |
| `--no-cloak`     | Skip CDP                | false            |
| `--eval`         | JavaScript extraction   | default          |
| `--snapshot`     | Accessibility tree      | -                |
| `--rawsnapshot`  | Raw YAML                | -                |
| `--selector CSS` | Extract element (fetch) | -                |
| `--timeout MS`   | Load timeout (fetch)    | `15000`          |

## Stealth Server

Run [CloakBrowser](https://github.com/CloakHQ/cloakbrowser) in Docker for Google/Bing without CAPTCHA:

```bash
# Option 1: docker run
docker run -d -p 9222:9222 cloakhq/cloakbrowser cloakserve

# Option 2: docker compose (from playwright-tools directory)
docker compose up -d
```

CLI auto-connects to `localhost:9222`.

## How It Works

**Browser priority:**

1. CDP server at `localhost:9222` (stealth, no CAPTCHA)
2. Playwright browser (if installed)
3. System Chrome (auto-detected)

**Extraction modes:**

| Mode     | Flag         | Stability | Speed  |
| -------- | ------------ | --------- | ------ |
| Eval     | `--eval`     | Low       | Fast   |
| Snapshot | `--snapshot` | High      | Medium |

## OpenCode Integration

Custom tools for [OpenCode](https://opencode.ai) are in the `opencode/` directory.

**Install:**

```bash
# Copy tools to your project's .opencode/tools/ directory
cp opencode/pt-web-search.ts your-project/.opencode/tools/
cp opencode/pt-web-fetch.ts your-project/.opencode/tools/
```

Or symlink:

```bash
ln -s $(pwd)/opencode/pt-web-search.ts your-project/.opencode/tools/
ln -s $(pwd)/opencode/pt-web-fetch.ts your-project/.opencode/tools/
```

**Tools:**

| Tool | Description |
|------|-------------|
| `pt-web-search` | Search DDG, Google, Bing via stealth browser |
| `pt-web-fetch` | Fetch pages with JS rendering, bypass bot detection |

These tools wrap the `pt` CLI and are available alongside OpenCode's built-in tools.

## Why This Exists

| Problem                    | This tool                            |
| -------------------------- | ------------------------------------ |
| `WebSearch` rate-limited   | Real browser                         |
| `WebFetch` returns 502/403 | JavaScript rendering                 |
| Google shows CAPTCHA       | CDP stealth server                   |
| CSS selectors break        | Snapshot mode                        |
| Vendor lock-in             | Only `playwright-core`, standard CDP |

## License

MIT
