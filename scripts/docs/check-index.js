'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkFiles } = require('./walk');
const { extractRelativeLinks } = require('./check-links');

const INDEX_PATH = 'docs/INDEX.md';

/**
 * A doc is exempt from the orphan check when it is INDEX itself, lives under
 * docs/archive/, or has any path segment starting with "_".
 *
 * The underscore rule is the general escape hatch — one rule rather than a
 * growing literal list. It covers plans/_template.md and wireframes/_prototypes/.
 *
 * @param {string} relPath repo-relative, "/"-separated
 * @returns {boolean}
 */
function isExempt(relPath) {
  if (relPath === INDEX_PATH) return true;
  if (relPath.startsWith('docs/archive/')) return true;
  return relPath.split('/').some((segment) => segment.startsWith('_'));
}

/**
 * Bidirectional INDEX completeness: every non-exempt doc must be referenced by
 * INDEX, and every path INDEX references must exist.
 *
 * @param {string} rootDir repo root
 * @returns {{ rule: string, file: string, line?: number, message: string }[]}
 */
function checkIndex(rootDir) {
  const indexAbsolute = path.join(rootDir, INDEX_PATH);
  if (!fs.existsSync(indexAbsolute)) {
    return [{ rule: 'index-dangling', file: INDEX_PATH, message: 'docs/INDEX.md is missing' }];
  }

  const indexContent = fs.readFileSync(indexAbsolute, 'utf8');
  const indexDir = path.dirname(indexAbsolute);
  const violations = [];
  const mentioned = new Set();

  for (const { target, line } of extractRelativeLinks(indexContent)) {
    const withoutAnchor = decodeURIComponent(target.split('#')[0]);
    const absolute = path.resolve(indexDir, withoutAnchor);
    const relative = path.relative(rootDir, absolute).replace(/\\/g, '/');
    mentioned.add(relative);

    if (!fs.existsSync(absolute)) {
      violations.push({
        rule: 'index-dangling',
        file: INDEX_PATH,
        line,
        message: `${withoutAnchor} does not exist`,
      });
    }
  }

  const docs = walkFiles(path.join(rootDir, 'docs'), ['.md']).map((p) => `docs/${p}`);
  for (const doc of docs) {
    if (isExempt(doc)) continue;
    if (!mentioned.has(doc)) {
      violations.push({
        rule: 'index-orphan',
        file: doc,
        message: 'not referenced in docs/INDEX.md',
      });
    }
  }

  return violations;
}

module.exports = { checkIndex, isExempt };
