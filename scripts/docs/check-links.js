'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkFiles } = require('./walk');

const LINK_REGEX = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CHECKED_EXTENSIONS = new Set(['.md', '.html']);
const ROOT_DOCS = ['README.md', 'CLAUDE.md', 'TECH-VERSIONS.md'];

const FENCE_OPEN = /^\s*(`{3,}|~{3,})/;
const INLINE_CODE = /`[^`]*`/g;

/**
 * Extract relative doc links worth checking, with 1-based line numbers.
 * Skips external schemes, bare anchors, non-doc extensions, fenced code
 * blocks, and inline code spans.
 *
 * Code-block skipping is essential, not cosmetic: this repo's plans and guides
 * are full of illustrative links inside ``` fences, and treating those as real
 * links produces false positives that would make the check untrustworthy.
 *
 * @param {string} content
 * @returns {{ target: string, line: number }[]}
 */
function extractLinks(content) {
  const lines = content.split(/\r?\n/);
  const links = [];
  let fenceMarker = null;

  for (let i = 0; i < lines.length; i += 1) {
    const fenceMatch = FENCE_OPEN.exec(lines[i]);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fenceMarker === null) {
        fenceMarker = marker[0];
        continue;
      }
      // A closing fence must use the same character and be at least as long.
      if (marker[0] === fenceMarker) {
        fenceMarker = null;
        continue;
      }
    }
    if (fenceMarker !== null) continue;

    const line = lines[i].replace(INLINE_CODE, '');

    let match;
    LINK_REGEX.lastIndex = 0;
    while ((match = LINK_REGEX.exec(line)) !== null) {
      const target = match[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // http:, mailto:, etc.
      if (target.startsWith('#')) continue;

      const withoutAnchor = target.split('#')[0];
      if (!withoutAnchor) continue;
      if (!CHECKED_EXTENSIONS.has(path.extname(withoutAnchor).toLowerCase())) continue;

      links.push({ target, line: i + 1 });
    }
  }

  return links;
}

/**
 * Validate every relative .md/.html link across docs/ (archive included) plus
 * the three root docs. Archived docs are kept so agents can search history —
 * links that 404 defeat that purpose, so archive is checked too.
 *
 * @param {string} rootDir repo root
 * @returns {{ rule: string, file: string, line: number, message: string }[]}
 */
function checkLinks(rootDir) {
  const docsFiles = walkFiles(path.join(rootDir, 'docs'), ['.md']).map((p) => `docs/${p}`);
  const rootFiles = ROOT_DOCS.filter((f) => fs.existsSync(path.join(rootDir, f)));
  const files = [...rootFiles, ...docsFiles];

  const violations = [];

  for (const file of files) {
    const absolute = path.join(rootDir, file);
    const content = fs.readFileSync(absolute, 'utf8');
    const fileDir = path.dirname(absolute);

    for (const { target, line } of extractLinks(content)) {
      const withoutAnchor = decodeURIComponent(target.split('#')[0]);
      const resolved = path.resolve(fileDir, withoutAnchor);
      if (!fs.existsSync(resolved)) {
        violations.push({
          rule: 'broken-link',
          file,
          line,
          message: `${withoutAnchor} does not exist`,
        });
      }
    }
  }

  return violations;
}

module.exports = { checkLinks, extractLinks };
