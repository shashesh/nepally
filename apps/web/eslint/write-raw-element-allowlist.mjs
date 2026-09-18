#!/usr/bin/env node
/**
 * Regenerates eslint/raw-element-allowlist.mjs from the files that currently
 * break react/forbid-elements. Run from the repo root:
 *   node apps/web/eslint/write-raw-element-allowlist.mjs
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

// Read by eslint.config.mjs when ESLint loads it inside lintFiles().
process.env.RAW_ELEMENT_ALLOWLIST_DISABLED = '1';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({ cwd: webRoot });
const results = await eslint.lintFiles(['src/**/*.tsx']);

const files = results
  .filter((result) => result.messages.some((message) => message.ruleId === 'react/forbid-elements'))
  .map((result) => path.relative(webRoot, result.filePath).replace(/\\/g, '/'))
  .sort();

const body = `/**
 * Files that still render raw <button>/<input>/<select>/<textarea>.
 * Each web UI overhaul area PR removes its files; delete the list when empty.
 * Regenerate: node apps/web/eslint/write-raw-element-allowlist.mjs
 */
export const RAW_ELEMENT_ALLOWLIST = ${JSON.stringify(files, null, 2)};
`;

writeFileSync(path.join(webRoot, 'eslint', 'raw-element-allowlist.mjs'), body);
console.log(`Allowlisted ${files.length} files.`);
