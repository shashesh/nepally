#!/usr/bin/env node
/**
 * Guard: web CSS Modules must use semantic design tokens.
 *
 * Fails on colour literals (hex, rgb/rgba, hsl/hsla, oklch/oklab) and on the
 * legacy design-system variables that legacy-aliases.css keeps alive during the
 * web UI overhaul. Files in guard-css-tokens.allowlist.json are skipped; an
 * allowlisted file that is now clean also fails, so the list only shrinks.
 * Spec: docs/specs/2026-09-14-web-ui-overhaul-design.md §4.1.
 *
 *   node scripts/guard-css-tokens.js                    check
 *   node scripts/guard-css-tokens.js --write-allowlist  record current offenders
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'apps/web/src');
const ALLOWLIST_PATH = path.join(__dirname, 'guard-css-tokens.allowlist.json');
const IGNORED_DIRS = new Set(['node_modules', '.next', 'coverage']);

const RULES = [
  {
    kind: 'colour literal',
    pattern: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(\s*[\d.]/g,
  },
  {
    kind: 'legacy token',
    pattern:
      /var\(\s*--(?:color-|gradient-|glass-|ghost-border|font-family\b|font-size-(?:h1|h2|h3|body|small|caption)\b|font-weight-extrabold|line-height-|space-(?:xxs|xs|s|m|l|xl|xxl)\b|radius-(?:sm|md|lg|xl)\b|shadow-(?:sm|md|lg|glass)\b|max-width|content-width|sidebar-width|nav-height|input-height|button-height|surface-(?:rail|topbar|nav)-|dropdown-|transition-)/g,
  },
];

function stripComments(content) {
  return content.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

function findViolations(content) {
  const violations = [];
  stripComments(content)
    .split(/\r?\n/)
    .forEach((line, index) => {
      for (const rule of RULES) {
        for (const match of line.matchAll(rule.pattern)) {
          violations.push({ line: index + 1, kind: rule.kind, text: match[0] });
        }
      }
    });
  return violations;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(fullPath, files);
    } else if (entry.name.endsWith('.module.css')) {
      files.push(fullPath);
    }
  }
  return files;
}

function toRepoPath(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function main() {
  const offenders = new Map();
  for (const filePath of walk(TARGET_DIR)) {
    const violations = findViolations(fs.readFileSync(filePath, 'utf8'));
    if (violations.length > 0) offenders.set(toRepoPath(filePath), violations);
  }

  if (process.argv.includes('--write-allowlist')) {
    fs.writeFileSync(ALLOWLIST_PATH, `${JSON.stringify([...offenders.keys()].sort(), null, 2)}\n`);
    console.log(`Wrote ${offenders.size} files to ${toRepoPath(ALLOWLIST_PATH)}.`);
    return;
  }

  const allowlist = new Set(
    fs.existsSync(ALLOWLIST_PATH) ? JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8')) : []
  );
  let failed = false;

  for (const [filePath, violations] of offenders) {
    if (allowlist.has(filePath)) continue;
    failed = true;
    for (const violation of violations) {
      console.error(`${filePath}:${violation.line} ${violation.kind}: ${violation.text}`);
    }
  }

  for (const filePath of allowlist) {
    if (!offenders.has(filePath)) {
      failed = true;
      console.error(`${filePath} is clean — remove it from scripts/guard-css-tokens.allowlist.json`);
    }
  }

  if (failed) {
    console.error('\nUse semantic tokens from apps/web/src/styles/tokens.css (docs/architecture/web-ui-system.md).\n');
    process.exit(1);
  }

  console.log('CSS Modules use semantic tokens (outside the allowlist).');
}

module.exports = { findViolations };

if (require.main === module) {
  main();
}
