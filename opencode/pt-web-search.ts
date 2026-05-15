import { tool } from "@opencode-ai/plugin"
import { execSync } from "child_process"

export default tool({
  description: `Search the web using DuckDuckGo, Google, or Bing via real browser.
- Uses stealth browser to bypass bot detection and CAPTCHAs
- Returns structured results: title, link, snippet
- Use this tool when the built-in websearch tool is unavailable or returns no results

Example:
  query="next.js tutorial"
  query="next.js tutorial" engine="ddg"`,
  args: {
    query: tool.schema.string().describe("Search query"),
    engine: tool.schema.enum(["ddg", "google", "bing"]).describe("Search engine to use").default("ddg"),
    limit: tool.schema.number().describe("Number of results to return (default: 5)").default(5),
  },
  async execute(args) {
    try {
      const engine = args.engine || "ddg"
      const limit = (args.limit || 5).toString()
      const result = execSync(`pt search ${engine} ${args.query} ${limit}`, { encoding: "utf8" })
      return result.trim()
    } catch (error: any) {
      return `Search failed: ${error.message}`
    }
  },
})
