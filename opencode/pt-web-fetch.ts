import { tool } from "@opencode-ai/plugin"
import { execSync } from "child_process"

export default tool({
  description: `Fetch web page content using a real browser with JavaScript rendering.
- Uses stealth browser to bypass bot detection (Cloudflare, etc.)
- Renders JavaScript before extracting content
- Use this tool when the built-in webfetch tool fails (502, 403, empty response)

Example:
  url="https://example.com"
  url="https://example.com" selector="article"
  url="https://example.com" format="text"`,
  args: {
    url: tool.schema.string().describe("URL to fetch"),
    selector: tool.schema.string().optional().describe("CSS selector to extract specific element (optional)"),
    format: tool.schema.enum(["text", "markdown", "html"]).optional().describe("Output format (default: markdown)").default("markdown"),
    snapshot: tool.schema.boolean().optional().describe("Return accessibility tree instead of text (default: false)").default(false),
  },
  async execute(args) {
    try {
      const flags: string[] = []
      if (args.selector) flags.push(`--selector=${args.selector}`)
      if (args.format && args.format !== 'markdown') flags.push(`--format=${args.format}`)
      if (args.snapshot) flags.push("--snapshot")
      const cmd = `pt fetch ${args.url} ${flags.join(' ')}`
      const result = execSync(cmd, { encoding: "utf8" })
      return result.trim()
    } catch (error: any) {
      return `Fetch failed: ${error.message}`
    }
  },
})
