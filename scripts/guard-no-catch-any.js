#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = [
  'apps/mobile/src',
  'apps/web/src',
  'packages/shared/src',
];
const IGNORED_DIRS = new Set(['node_modules', '.next', 'dist', 'build', 'coverage', '.git']);
const FILE_EXTENSIONS = new Set(['.ts', '.tsx']);
const CATCH_ANY_REGEX = /catch\s*\(\s*error\s*:\s*any\s*\)/g;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        walk(fullPath, files);
      }
      continue;
    }

    const ext = path.extname(entry.name);
    if (FILE_EXTENSIONS.has(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

function findViolations(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const violations = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (CATCH_ANY_REGEX.test(lines[i])) {
      violations.push({ line: i + 1, text: lines[i].trim() });
    }
    CATCH_ANY_REGEX.lastIndex = 0;
  }

  return violations;
}

const allFiles = TARGET_DIRS.flatMap((relativeDir) => walk(path.join(ROOT, relativeDir)));
const allViolations = [];

for (const filePath of allFiles) {
  const violations = findViolations(filePath);
  for (const violation of violations) {
    allViolations.push({
      filePath: path.relative(ROOT, filePath).replace(/\\/g, '/'),
      line: violation.line,
      text: violation.text,
    });
  }
}

if (allViolations.length > 0) {
  console.error('\nFound disallowed "catch (error: any)" patterns:\n');
  for (const violation of allViolations) {
    console.error(`${violation.filePath}:${violation.line} ${violation.text}`);
  }
  console.error('\nUse "catch (error: unknown)" and narrow with "instanceof Error".\n');
  process.exit(1);
}

console.log('No disallowed "catch (error: any)" patterns found.');
