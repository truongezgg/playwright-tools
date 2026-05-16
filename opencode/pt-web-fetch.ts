import { tool } from "@opencode-ai/plugin"
import { execSync } from "child_process"

export default tool({
  description: `Fetch web page content using a stealth browser with JavaScript rendering.
- Uses remote CDP stealth browser (cloakbrowser) to bypass Cloudflare and bot detection
- Renders JavaScript SPAs before extracting content
- Returns full page content in markdown, text, or HTML format
- GitHub URLs: fetches raw content directly (fast, no browser needed)
- Use this when built-in webfetch fails (403, empty response, JS-rendered pages)

IMPORTANT: prefer built-in webfetch for simple pages. Use this for:
  - Cloudflare-protected sites
  - JavaScript-heavy SPAs that return empty content without rendering
  - Sites requiring browser-level stealth
  - GitHub repository/file URLs (handled automatically)

Examples:
  url="https://example.com"
  url="https://example.com" selector="article"
  url="https://example.com" format="text"
  url="https://github.com/owner/repo"
  url="https://github.com/owner/repo/blob/main/file.js"
  url="https://example.com" timeout=60`,
  args: {
    url: tool.schema.string().describe("URL to fetch"),
    selector: tool.schema.string().optional().describe("CSS selector to extract specific element (optional)"),
    format: tool.schema.enum(["text", "markdown", "html"]).optional().describe("Output format (default: markdown)").default("markdown"),
    snapshot: tool.schema.boolean().optional().describe("Return accessibility tree instead of text (default: false)").default(false),
    timeout: tool.schema.number().optional().describe("Timeout in seconds (default: 30)").default(30),
  },
  async execute(args) {
    try {
      const flags: string[] = []
      if (args.selector) flags.push(`--selector=${args.selector}`)
      if (args.format && args.format !== 'markdown') flags.push(`--format=${args.format}`)
      if (args.snapshot) flags.push("--snapshot")
      if (args.timeout && args.timeout !== 30) flags.push(`--timeout=${args.timeout * 1000}`)
      const cmd = `pt fetch ${args.url} ${flags.join(' ')}`
      const execTimeout = (args.timeout || 30) * 1000 + 5000
      const result = execSync(cmd, { encoding: "utf8", timeout: execTimeout })

      // Parse JSON output from pt fetch
      let data: any
      try {
        data = JSON.parse(result)
      } catch {
        // Not JSON, return raw
        return result.trim()
      }

      if (data.metadata?.error) {
        const err = data.output || "Unknown error"
        // Clean error messages
        if (err.includes("CAPTCHA")) {
          return `Site blocked or CAPTCHA detected for ${args.url}. Content may require manual browser access.`
        }
        if (err.includes("timeout") || err.includes("Timeout")) {
          return `Fetch timed out for ${args.url}. Site may be slow or unreachable. Try increasing timeout.`
        }
        return `Fetch failed for ${args.url}: ${err}`
      }

      const content = data.output || ""
      if (!content || content.trim().length === 0) {
        return `Empty response from ${args.url}. Site may require JavaScript rendering or returned no content.`
      }

      // Format with header
      const sizeKB = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1)
      const formatLabel = args.format || "markdown"
      const header = `# Fetched: ${args.url} (${formatLabel}, ${sizeKB}KB)`

      return `${header}\n\n${content}`
    } catch (error: any) {
      const msg = error.message || String(error)
      if (msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
        return "Fetch failed: Cannot connect to CDP server. Check cloakbrowser is running and cdpUrl is correct."
      }
      if (msg.includes("SIGTERM") || msg.includes("killed")) {
        return `Fetch timed out for ${args.url}. Try increasing timeout parameter.`
      }
      return `Fetch failed: ${msg}`
    }
  },
})
