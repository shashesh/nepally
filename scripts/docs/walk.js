'use strict';

const fs = require('node:fs');
const path = require('node:path');

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
]);

/**
 * Recursively collect files under rootDir matching the given extensions.
 * Returns paths relative to rootDir, "/"-separated, sorted.
 *
 * Uses a hand-rolled walk rather than fs.globSync because package.json
 * engines.node is ">=20.19.0" and globSync landed in Node 22.
 *
 * @param {string} rootDir
 * @param {string[]} extensions e.g. ['.md']
 * @returns {string[]}
 */
function walkFiles(rootDir, extensions) {
  const wanted = new Set(extensions);
  const results = [];

  function walk(currentDir) {
    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) walk(fullPath);
        continue;
      }
      if (wanted.has(path.extname(entry.name))) {
        results.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
      }
    }
  }

  if (!fs.existsSync(rootDir)) return [];
  walk(rootDir);
  return results.sort();
}

module.exports = { walkFiles, IGNORED_DIRS };
