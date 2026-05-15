import { tool } from "@opencode-ai/plugin"

export default tool({
  description: `Search the web using DuckDuckGo, Google, or Bing via real browser.
- Uses stealth browser to bypass bot detection and CAPTCHAs
- Returns structured results: title, link, snippet
- Supports multiple search engines with different strengths
- Use this tool for accessing information beyond knowledge cutoff
- Use this tool when the built-in websearch tool is unavailable or returns no results

Usage notes:
  - DuckDuckGo: fast, headless, no CAPTCHA (recommended for quick searches)
  - Google: requires headed mode or stealth server for CAPTCHA solving
  - Bing: requires headed mode or stealth server
  - Results are filtered to remove ads
  - Default: 5 results from DuckDuckGo`,
  args: {
    query: tool.schema.string().describe("Search query"),
    engine: tool.schema.enum(["ddg", "google", "bing"]).describe("Search engine to use").default("ddg"),
    count: tool.schema.number().describe("Number of results to return (default: 5)").default(5),
  },
  async execute(args) {
    try {
      const result = await Bun.$`pt search ${args.engine} ${args.query} ${args.count.toString()}`.text()
      return result.trim()
    } catch (error: any) {
      const stderr = error.stderr?.toString() || ""
      const stdout = error.stdout?.toString() || ""
      return `Search failed (exit ${error.exitCode}): ${stderr || stdout || error.message}`
    }
  },
})
