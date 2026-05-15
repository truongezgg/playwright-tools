import { tool } from "@opencode-ai/plugin"

export default tool({
  description: `Fetch web page content using a real browser with JavaScript rendering.
- Uses stealth browser to bypass bot detection (Cloudflare, etc.)
- Renders JavaScript before extracting content
- Use this tool when the built-in webfetch tool fails (502, 403, empty response)

Example: url="https://example.com" selector="article"`,
  args: {
    url: tool.schema.string().describe("URL to fetch"),
    selector: tool.schema.string().optional().describe("CSS selector to extract specific element (optional)"),
    snapshot: tool.schema.boolean().optional().describe("Return accessibility tree instead of text (default: false)").default(false),
  },
  async execute(args) {
    try {
      const flags: string[] = []
      if (args.selector) flags.push(`--selector=${args.selector}`)
      if (args.snapshot) flags.push("--snapshot")
      const result = await Bun.$`pt fetch ${args.url} ${flags}`.text()
      return result.trim()
    } catch (error: any) {
      const stderr = error.stderr?.toString() || ""
      const stdout = error.stdout?.toString() || ""
      return `Fetch failed (exit ${error.exitCode}): ${stderr || stdout || error.message}`
    }
  },
})
