/**
 * Snapshot parser for search results.
 * Parses accessibility tree YAML into structured data.
 */

// Extract text from YAML line — handle "text", 'text', and : text
export function extractText(line) {
  let match = line.match(/"([^"]+)"/);
  if (match) return match[1].trim();
  match = line.match(/'([^']+)'/);
  if (match) return match[1].trim();
  match = line.match(/:\s*(.+)/);
  if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  return '';
}

// Extract URL from /url: line
export function extractUrl(line) {
  const match = line.match(/\/url:\s*(.+)/);
  return match ? match[1].trim() : '';
}

/**
 * Parse DDG snapshot.
 */
export function parseDdgSnapshot(yaml, count = 5) {
  const lines = yaml.split('\n');
  const results = [];
  let current = null;
  let inArticle = false;
  let afterHeading = false;
  let headingIndent = 0;
  let foundUrlInHeading = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.search(/\S/);

    if (trimmed.startsWith('- article ')) {
      if (current && current.title) results.push(current);
      current = { title: '', link: '', snippet: '' };
      inArticle = true;
      afterHeading = false;
      foundUrlInHeading = false;
      headingIndent = 0;
      continue;
    }

    if (!inArticle || !current) continue;

    if ((trimmed.startsWith('- heading ') || trimmed.startsWith("- 'heading ")) && trimmed.includes('[level=2]')) {
      current.title = extractText(trimmed);
      afterHeading = true;
      headingIndent = indent;
      foundUrlInHeading = false;
      continue;
    }

    if (afterHeading && indent > headingIndent) {
      if (trimmed.startsWith('- link ') || trimmed.startsWith("- 'link ")) {
        const linkText = extractText(trimmed);
        if (linkText && !current.title) current.title = linkText;
        continue;
      }
      if (trimmed.startsWith('- /url:')) {
        current.link = extractUrl(trimmed);
        foundUrlInHeading = true;
        continue;
      }
      if (trimmed.startsWith('- generic')) {
        const text = extractText(trimmed);
        if (text && text.length > 10 && !current.title) current.title = text;
        continue;
      }
      continue;
    }

    if (afterHeading && foundUrlInHeading && indent <= headingIndent) {
      afterHeading = false;
    }

    if (current.link && !current.snippet && !afterHeading) {
      if (trimmed.startsWith('- generic') || trimmed.startsWith('- paragraph')) {
        const text = extractText(trimmed);
        if (text && text.length > 30 && text !== current.title) {
          current.snippet = text;
        }
      }
    }
  }

  if (current && current.title) results.push(current);

  return results
    .filter(r => r.title && r.link)
    .filter(r => !r.title.includes('\nAD'))
    .filter(r => !r.link.match(/duckduckgo\.com\/.*\.js/))
    .filter(r => !r.title.startsWith('Videos for'))
    .filter(r => !r.title.startsWith('Images for'))
    .slice(0, count);
}

/**
 * Parse Google snapshot.
 */
export function parseGoogleSnapshot(yaml, count = 5) {
  const lines = yaml.split('\n');
  const results = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if ((trimmed.startsWith('- heading ') || trimmed.startsWith("- 'heading ")) && trimmed.includes('[level=3]')) {
      if (current && current.title) results.push(current);
      current = { title: extractText(trimmed), link: '', snippet: '' };
      continue;
    }

    if (!current) continue;

    if (trimmed.startsWith('- /url:') && !current.link) {
      current.link = extractUrl(trimmed);
      continue;
    }

    if (current.link && !current.snippet) {
      if (trimmed.startsWith('- paragraph') || trimmed.startsWith('- generic')) {
        const text = extractText(trimmed);
        if (text && text.length > 30) current.snippet = text;
      }
    }
  }

  if (current && current.title) results.push(current);
  return results.filter(r => r.title && r.link).slice(0, count);
}

/**
 * Parse Bing snapshot.
 */
export function parseBingSnapshot(yaml, count = 5) {
  const lines = yaml.split('\n');
  const results = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if ((trimmed.startsWith('- heading ') || trimmed.startsWith("- 'heading ")) && trimmed.includes('[level=2]')) {
      if (current && current.title) results.push(current);
      current = { title: extractText(trimmed), link: '', snippet: '' };
      continue;
    }

    if (!current) continue;

    if (trimmed.startsWith('- /url:') && !current.link) {
      current.link = extractUrl(trimmed);
      continue;
    }

    if (current.link && !current.snippet) {
      const text = extractText(trimmed);
      if (text && text.length > 30) current.snippet = text;
    }
  }

  if (current && current.title) results.push(current);
  return results.filter(r => r.title && r.link).slice(0, count);
}

/**
 * Parse snapshot YAML for any engine.
 */
export function parseSnapshot(yaml, engine, count = 5) {
  const parsers = {
    ddg: parseDdgSnapshot,
    google: parseGoogleSnapshot,
    bing: parseBingSnapshot,
  };
  const parser = parsers[engine];
  if (!parser) throw new Error(`Unknown engine: ${engine}. Use: ddg, google, bing`);
  return parser(yaml, count);
}
