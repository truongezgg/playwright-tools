import { tool } from "@opencode-ai/plugin"

export default tool({
  description: `Search the web using DuckDuckGo, Google, or Bing via real browser.
- Uses stealth browser to bypass bot detection and CAPTCHAs
- Returns structured results: title, link, snippet
- Use this tool when the built-in websearch tool is unavailable or returns no results

Example: query="next.js tutorial" engine="ddg" limit=5`,
  args: {
    query: tool.schema.string().describe("Search query"),
    engine: tool.schema.enum(["ddg", "google", "bing"]).describe("Search engine to use").default("ddg"),
    limit: tool.schema.number().describe("Number of results to return (default: 5)").default(5),
  },
  async execute(args) {
    try {
      const limit = (args.limit || 5).toString()
      const result = await Bun.$`pt search ${args.engine} ${args.query} ${limit}`.text()
      return result.trim()
    } catch (error: any) {
      const stderr = error.stderr?.toString() || ""
      const stdout = error.stdout?.toString() || ""
      return `Search failed (exit ${error.exitCode}): ${stderr || stdout || error.message}`
    }
  },
})
