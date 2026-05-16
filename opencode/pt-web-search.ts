import { tool } from "@opencode-ai/plugin"
import { execSync } from "child_process"

export default tool({
  description: `Search the web using DuckDuckGo, Google, or Bing via stealth browser (cloakbrowser CDP).
- Uses remote stealth browser to bypass bot detection and CAPTCHAs
- Returns structured results: title, link, snippet
- Use this when built-in websearch is unavailable, returns no results, or needs browser-based scraping

Current year is ${new Date().getFullYear()}. Use it when searching for recent information.
Example: If user asks "latest AI news", search "AI news ${new Date().getFullYear()}", NOT "AI news 2025".

Engines:
  ddg: DuckDuckGo - headless by default, fastest, least likely to block
  google: Google - best results, may need --headed for CAPTCHA
  bing: Bing - good alternative, intermediate blocking risk
  exa: Exa - semantic/neural search, best for brand/topic queries, uses cached token

Search types:
  auto: balanced search (default)
  fast: quick results (3 results, DDG headless)
  deep: comprehensive search (10 results, tries Google first)`,
  args: {
    query: tool.schema.string().describe("Search query"),
    engine: tool.schema.enum(["ddg", "google", "bing", "exa"]).describe("Search engine to use").default("ddg"),
    limit: tool.schema.number().describe("Number of results to return (default: 5)").default(5),
    type: tool.schema.enum(["auto", "fast", "deep"]).describe("Search type: auto (default), fast (quick), deep (comprehensive)").default("auto"),
  },
  async execute(args) {
    try {
      let engine = args.engine || "ddg"
      let limit = args.limit || 5

      // Adjust based on search type
      if (args.type === "fast") {
        engine = "ddg"
        limit = Math.min(limit, 3)
      } else if (args.type === "deep") {
        engine = args.engine || "google"
        limit = Math.max(limit, 10)
      }

      // Sanitize query to prevent shell injection (query is in double quotes)
      const safeQuery = args.query.replace(/["$`\\]/g, '\\$&').replace(/\n/g, ' ')
      const result = execSync(`pt search ${engine} "${safeQuery}" ${limit}`, { encoding: "utf8", timeout: 30000 })

      // Parse JSON output
      let data: any
      try {
        data = JSON.parse(result)
      } catch {
        return result.trim()
      }

      if (!data.success) {
        // Clean error messages
        const err = data.error || "Unknown error"
        if (err.includes("CAPTCHA")) {
          return `Search blocked by CAPTCHA on ${engine}. Try a different engine (ddg or bing) or use --no-cloak for local browser.`
        }
        if (err.includes("No results")) {
          return `No results found for "${args.query}" on ${engine}. Try different engine or query.`
        }
        return `Search failed on ${engine}: ${err}`
      }

      if (!data.results || data.results.length === 0) {
        return `No results found for "${args.query}" on ${engine}. Try different engine or query.`
      }

      // Format as clean markdown
      const lines = [`# Search: "${args.query}" (${engine}, ${data.results.length} results)`]
      lines.push("")
      for (let i = 0; i < data.results.length; i++) {
        const r = data.results[i]
        lines.push(`${i + 1}. **${r.title}**`)
        lines.push(`   ${r.link}`)
        if (r.snippet) {
          lines.push(`   ${r.snippet}`)
        }
        lines.push("")
      }

      return lines.join("\n")
    } catch (error: any) {
      const msg = error.message || String(error)
      if (msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) {
        return "Search failed: Cannot connect to CDP server. Check cloakbrowser is running and cdpUrl is correct."
      }
      if (msg.includes("CAPTCHA")) {
        return "Search blocked by CAPTCHA. Try engine=ddg or --no-cloak for local browser."
      }
      return `Search failed: ${msg}`
    }
  },
})
