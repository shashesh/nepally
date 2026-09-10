'use strict';

const FENCE = /^---[ \t]*\r?\n/;

/**
 * Parse a leading `---` fenced block of flat `key: value` pairs.
 * Deliberately not a YAML parser — the frontmatter contract has no nesting or
 * lists, which does not justify a dependency at the monorepo root.
 *
 * @param {string} content
 * @returns {{ data: Record<string, string>, body: string } | null}
 */
function parseFrontmatter(content) {
  if (!FENCE.test(content)) return null;

  const lines = content.split(/\r?\n/);
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }
  if (closingIndex === -1) return null;

  const data = {};
  for (let i = 1; i < closingIndex; i += 1) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.length >= 2 && /^(".*"|'.*')$/.test(value)) {
      value = value.slice(1, -1);
    }
    if (key) data[key] = value;
  }

  return { data, body: lines.slice(closingIndex + 1).join('\n') };
}

module.exports = { parseFrontmatter };
