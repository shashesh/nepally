'use strict';

const { checkLinks } = require('./check-links');
const { checkIndex } = require('./check-index');
const { checkLifecycle } = require('./check-lifecycle');

/**
 * @param {string} rootDir repo root
 * @returns {{ rule: string, file: string, line?: number, message: string }[]}
 */
function runAllChecks(rootDir) {
  return [...checkLinks(rootDir), ...checkIndex(rootDir), ...checkLifecycle(rootDir)];
}

/**
 * Group violations by rule so a large run stays readable, and print
 * file:line so terminals and CI annotations can link to the source.
 *
 * @param {{ rule: string, file: string, line?: number, message: string }[]} violations
 * @returns {string}
 */
function formatViolations(violations) {
  if (violations.length === 0) {
    return 'docs:check - clean, 0 violations.';
  }

  const byRule = new Map();
  for (const violation of violations) {
    if (!byRule.has(violation.rule)) byRule.set(violation.rule, []);
    byRule.get(violation.rule).push(violation);
  }

  const lines = [`docs:check - ${violations.length} violations`, ''];

  for (const [rule, items] of [...byRule.entries()].sort()) {
    lines.push(`  ${rule} (${items.length})`);
    for (const item of items) {
      const location = item.line ? `${item.file}:${item.line}` : item.file;
      lines.push(`    ${location}`);
      lines.push(`      -> ${item.message}`);
    }
    lines.push('');
  }

  lines.push('Run `npm run docs:check` locally to reproduce.');
  lines.push('See docs/guides/documentation-workflow.md for what each rule means.');
  return lines.join('\n');
}

module.exports = { runAllChecks, formatViolations };
