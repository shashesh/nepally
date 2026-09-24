#!/usr/bin/env node
/**
 * Guard: web CSS Modules must use semantic design tokens.
 *
 * Fails on colour literals (hex, rgb/rgba, hsl/hsla, oklch/oklab), named
 * colours, primitive tokens and the legacy design-system variables, in every
 * CSS Module under apps/web/src, and on any var(--x) whose name tokens.css
 * does not define (a typo such as --text-sm silently falls back to the
 * inherited value). There is no allowlist.
 * Spec: docs/specs/2026-09-14-web-ui-overhaul-design.md §4.1.
 *
 *   node scripts/guard-css-tokens.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, 'apps/web/src');
const TOKENS_PATH = path.join(TARGET_DIR, 'styles/tokens.css');
const IGNORED_DIRS = new Set(['node_modules', '.next', 'coverage']);

/**
 * Variables a Mantine component sets on its own root, which a module may read.
 * Each names the component; add one only after checking Mantine sets it.
 */
const MANTINE_COMPONENT_PROPERTIES = [
  '--tabs-list-border-width', // Tabs: the list's bottom border (scrollingTabs.module.css)
];

/** CSS named colours. `transparent` and `currentColor` are keywords, not literals, so they stay legal. */
const NAMED_COLOURS = [
  'aqua', 'aquamarine', 'beige', 'black', 'blue', 'brown', 'coral', 'crimson', 'cyan', 'fuchsia',
  'gold', 'gray', 'green', 'grey', 'indigo', 'ivory', 'khaki', 'lavender', 'lime', 'magenta',
  'maroon', 'navy', 'olive', 'orange', 'orchid', 'pink', 'plum', 'purple', 'red', 'salmon',
  'silver', 'tan', 'teal', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'yellow',
];

const RULES = [
  {
    // CSS function names are case-insensitive, so RGB(...) and OKLCH(...) must fail too.
    kind: 'colour literal',
    pattern: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\(\s*[\d.]/gi,
  },
  {
    // Value position only, and never part of a longer identifier, so `--ink-white`,
    // `.whiteBox` and url(black.png) do not trip it.
    kind: 'named colour',
    pattern: new RegExp(`(?<=:[^;{}]*)(?<![\\w-])(?:${NAMED_COLOURS.join('|')})(?![\\w.-])`, 'gi'),
  },
  {
    // Primitives live in tokens.css; CSS Modules consume the semantic layer only.
    kind: 'primitive token',
    pattern: /var\(\s*--(?:ink|marigold|paper|moss|crimson|amber)-\d+\b/g,
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

const VAR_REFERENCE = /var\(\s*(--[\w-]+)/g;
const PROPERTY_DECLARATION = /(--[\w-]+)\s*:/g;
const LEGACY_RULE = RULES.find((rule) => rule.kind === 'legacy token');

/** Every custom property a stylesheet declares. */
function readTokenNames(css) {
  return new Set([...stripComments(css).matchAll(PROPERTY_DECLARATION)].map((match) => match[1]));
}

function isLegacyName(name) {
  return new RegExp(LEGACY_RULE.pattern.source).test(`var(${name})`);
}

/**
 * One violation per var(--x) whose name is not a token, not declared in the
 * same file, not Mantine's, and not already a legacy-token violation. A
 * fallback does not excuse it: a fallback is how such a typo hides.
 */
function findUndefinedProperties(content, tokenNames) {
  const stripped = stripComments(content);
  const local = readTokenNames(stripped);
  const violations = [];
  stripped.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(VAR_REFERENCE)) {
      const name = match[1];
      const defined =
        tokenNames.has(name) ||
        local.has(name) ||
        name.startsWith('--mantine-') ||
        MANTINE_COMPONENT_PROPERTIES.includes(name) ||
        isLegacyName(name);
      if (!defined) violations.push({ line: index + 1, kind: 'undefined property', text: name });
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

/**
 * One error line per violation across `files`, as `path:line kind: text`.
 * With `tokenNames`, undefined custom properties are reported too.
 * @param {Array<{ path: string, content: string }>} files
 * @param {Set<string>} [tokenNames]
 * @returns {string[]}
 */
function checkFiles(files, tokenNames) {
  return files.flatMap((file) =>
    [
      ...findViolations(file.content),
      ...(tokenNames ? findUndefinedProperties(file.content, tokenNames) : []),
    ]
      .sort((a, b) => a.line - b.line)
      .map((violation) => `${file.path}:${violation.line} ${violation.kind}: ${violation.text}`)
  );
}

function main() {
  const files = walk(TARGET_DIR).map((filePath) => ({
    path: toRepoPath(filePath),
    content: fs.readFileSync(filePath, 'utf8'),
  }));
  const errors = checkFiles(files, readTokenNames(fs.readFileSync(TOKENS_PATH, 'utf8')));

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    console.error('\nUse semantic tokens from apps/web/src/styles/tokens.css (docs/architecture/web-ui-system.md).\n');
    process.exit(1);
  }

  console.log(`All ${files.length} CSS Modules use semantic tokens.`);
}

module.exports = {
  MANTINE_COMPONENT_PROPERTIES,
  checkFiles,
  findUndefinedProperties,
  findViolations,
  readTokenNames,
};

if (require.main === module) {
  main();
}
