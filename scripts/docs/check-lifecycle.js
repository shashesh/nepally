'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkFiles } = require('./walk');
const { parseFrontmatter } = require('./frontmatter');

const VALID_STATUSES = new Set(['planned', 'in-progress', 'implemented', 'abandoned']);
const TERMINAL_STATUSES = new Set(['implemented', 'abandoned']);

// Frontmatter keys required on every tracked plan/spec, besides `status`
// (which has its own dedicated enum check below).
const REQUIRED_FIELDS = ['title', 'created'];

// Directories whose .md files must carry lifecycle frontmatter.
const TRACKED_DIRS = ['docs/plans', 'docs/specs', 'docs/archive'];
const EXEMPT = new Set(['docs/plans/_template.md']);

/**
 * Enforce the plan/spec lifecycle: valid frontmatter everywhere, and the
 * archive invariant — terminal status means the file lives under docs/archive/,
 * and archived files must not still be planned or in-progress.
 *
 * @param {string} rootDir repo root
 * @returns {{ rule: string, file: string, message: string }[]}
 */
function checkLifecycle(rootDir) {
  const violations = [];

  const files = TRACKED_DIRS.flatMap((dir) =>
    walkFiles(path.join(rootDir, dir), ['.md']).map((p) => `${dir}/${p}`),
  );

  for (const file of files) {
    if (EXEMPT.has(file)) continue;

    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const parsed = parseFrontmatter(content);

    if (!parsed) {
      violations.push({
        rule: 'missing-frontmatter',
        file,
        message: 'no frontmatter block; expected title, status, created',
      });
      continue;
    }

    const missingFields = REQUIRED_FIELDS.filter((key) => !parsed.data[key]);
    if (missingFields.length > 0) {
      violations.push({
        rule: 'missing-frontmatter-field',
        file,
        message: `frontmatter is missing required field(s): ${missingFields.join(', ')}`,
      });
    }

    const status = parsed.data.status;
    if (!VALID_STATUSES.has(status)) {
      violations.push({
        rule: 'invalid-status',
        file,
        message: `status "${status ?? '(absent)'}" is not one of ${[...VALID_STATUSES].join(', ')}`,
      });
      continue;
    }

    const isArchived = file.startsWith('docs/archive/');
    const isTerminal = TERMINAL_STATUSES.has(status);

    if (isTerminal && !isArchived) {
      violations.push({
        rule: 'unarchived-terminal',
        file,
        message: `status "${status}" requires the file to live under docs/archive/`,
      });
    } else if (!isTerminal && isArchived) {
      violations.push({
        rule: 'archived-non-terminal',
        file,
        message: `status "${status}" is not terminal; archived files must be implemented or abandoned`,
      });
    }
  }

  return violations;
}

module.exports = { checkLifecycle, VALID_STATUSES, TERMINAL_STATUSES };
