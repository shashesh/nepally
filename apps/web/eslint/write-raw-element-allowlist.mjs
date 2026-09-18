#!/usr/bin/env node
/**
 * Keeps eslint/raw-element-allowlist.mjs honest against the files that
 * currently break react/forbid-elements. Run from the repo root:
 *
 *   node apps/web/eslint/write-raw-element-allowlist.mjs          regenerate
 *   node apps/web/eslint/write-raw-element-allowlist.mjs --check  fail on drift
 *
 * The allowlist is applied through ESLint `ignores`, which skips a file
 * silently, so a migrated file left in the list would keep new raw elements
 * unreported. --check is the counterpart to the CSS guard's clean-file failure:
 * it fails on stale entries, so the list can only shrink.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { RAW_ELEMENT_ALLOWLIST } from './raw-element-allowlist.mjs';

// Read by eslint.config.mjs when ESLint loads it inside lintFiles().
process.env.RAW_ELEMENT_ALLOWLIST_DISABLED = '1';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const eslint = new ESLint({ cwd: webRoot });
const results = await eslint.lintFiles(['src/**/*.tsx']);

const files = results
  .filter((result) => result.messages.some((message) => message.ruleId === 'react/forbid-elements'))
  .map((result) => path.relative(webRoot, result.filePath).replace(/\\/g, '/'))
  .sort();

if (process.argv.includes('--check')) {
  const stale = RAW_ELEMENT_ALLOWLIST.filter((file) => !files.includes(file));
  const missing = files.filter((file) => !RAW_ELEMENT_ALLOWLIST.includes(file));

  for (const file of stale) {
    console.error(`${file} no longer renders a raw element — remove it from eslint/raw-element-allowlist.mjs`);
  }
  for (const file of missing) {
    console.error(`${file} renders a raw element but is not allowlisted — migrate it to Mantine`);
  }

  if (stale.length > 0 || missing.length > 0) {
    console.error('\nRegenerate with: node apps/web/eslint/write-raw-element-allowlist.mjs\n');
    process.exit(1);
  }

  console.log(`Raw-element allowlist matches the ${files.length} files still awaiting migration.`);
} else {
  const body = `/**
 * Files that still render raw <button>/<input>/<select>/<textarea>.
 * Each web UI overhaul area PR removes its files; delete the list when empty.
 * Regenerate: node apps/web/eslint/write-raw-element-allowlist.mjs
 */
export const RAW_ELEMENT_ALLOWLIST = ${JSON.stringify(files, null, 2)};
`;

  writeFileSync(path.join(webRoot, 'eslint', 'raw-element-allowlist.mjs'), body);
  console.log(`Allowlisted ${files.length} files.`);
}
