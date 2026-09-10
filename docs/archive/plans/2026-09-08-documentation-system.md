---
title: Documentation system — organization and CI-enforced currency
status: implemented
created: 2026-09-08
spec: docs/specs/2026-09-08-documentation-system-design.md
---

# Documentation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move documentation currency onto the same mechanical footing as lint and type-check — a `docs:check` script wired into CI that fails a PR on broken links, docs missing from INDEX, and finished plans left in `active/` — then clean up the accumulated drift so enforcement can be blocking from day one.

**Architecture:** Three pure checker functions (`checkLinks`, `checkIndex`, `checkLifecycle`), each a function of a root directory returning a `Violation[]`, unit-tested against synthetic fixture trees rather than the live repo. A thin CLI aggregates them and sets the exit code. Build the tooling **first**, then run it to *drive* the cleanup — the checkers tell us exactly what is broken instead of us guessing. CI turns on last, once the repo is green.

**Tech Stack:** Plain CommonJS Node, zero new dependencies. `node:test` + `node:assert/strict` for tests. GitHub Actions reusing the existing `ci-job.yml` reusable workflow.

**Spec:** [docs/specs/2026-09-08-documentation-system-design.md](../specs/2026-09-08-documentation-system-design.md)

**Branch:** `chore/docs-system` (already created, off `master`). The spec is already committed there as `3ffb85b`.

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include these.

- **CommonJS only.** Use `require`, not `import`. Root `package.json` declares no `"type": "module"`; `scripts/guard-no-catch-any.js` is the pattern to follow.
- **Zero new dependencies.** Do not add anything to `package.json` `dependencies` or `devDependencies`.
- **Node floor is `>=20.19.0`** (`package.json` `engines`), not the `24` in `.nvmrc`/CI. **Do not use `fs.globSync`** — it landed in Node 22. Use a recursive `walk()` with an ignore set.
- **CRLF is mandatory to handle.** This repo is developed on Windows; git reports `LF will be replaced by CRLF`. Every line split must be `/\r?\n/`, never `'\n'`.
- **Path separators normalize to `/`.** Always `.replace(/\\/g, '/')` before comparing or printing paths, exactly as `guard-no-catch-any.js` does.
- **Violation shape is fixed:** `{ rule: string, file: string, line?: number, message: string }`. `file` is repo-relative with `/` separators.
- **Git commit is allowed without asking; `git push` is NEVER allowed without explicit user confirmation** (CLAUDE.md, non-negotiable). Do not push at the end of any task.
- **Never commit to `master`.** All work lands on `chore/docs-system`.
- **Frontmatter contract:** flat `key: value` only. Fields: `title` (required), `status` (required, one of `planned|in-progress|implemented|abandoned`), `created` (required, `YYYY-MM-DD`), `spec` (optional, repo-relative path).

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/docs/frontmatter.js` | Parse a leading `---` fenced block into a flat object. No other job. |
| `scripts/docs/walk.js` | Recursive directory traversal returning normalized relative paths. Shared by all three checkers. |
| `scripts/docs/check-links.js` | `checkLinks(rootDir) -> Violation[]` — every relative `.md`/`.html` link resolves. |
| `scripts/docs/check-index.js` | `checkIndex(rootDir) -> Violation[]` — bidirectional INDEX completeness. |
| `scripts/docs/check-lifecycle.js` | `checkLifecycle(rootDir) -> Violation[]` — frontmatter validity + archive invariant. |
| `scripts/docs/index.js` | CLI entrypoint. Runs all three, formats grouped output, sets exit code. No check logic. |
| `scripts/docs/__fixtures__/` | Synthetic doc trees. One subdirectory per scenario. |
| `scripts/docs/*.test.js` | `node:test` suites, one per module. |
| `docs/guides/documentation-workflow.md` | The SOP: trigger matrix, lifecycle, quarterly sweep. |
| `.github/workflows/docs.yml` | Path-filtered caller of `ci-job.yml`. |
| `.github/ISSUE_TEMPLATE/*.yml` | Four issue forms + `config.yml`. |
| `.github/CODEOWNERS` | Review gating, primarily for the Copilot agent. |

Traversal lives in its own module because all three checkers need it and duplicating a `walk` three times is exactly the kind of drift this plan exists to prevent.

---

## Task 1: Frontmatter parser

**Files:**
- Create: `scripts/docs/frontmatter.js`
- Test: `scripts/docs/frontmatter.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseFrontmatter(content: string) -> { data: Record<string,string>, body: string } | null`. Returns `null` when there is no leading `---` fence. Used by Task 4 (`check-lifecycle`).

- [ ] **Step 1: Write the failing test**

Create `scripts/docs/frontmatter.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter } = require('./frontmatter');

test('parses flat key: value pairs', () => {
  const result = parseFrontmatter('---\ntitle: Hello\nstatus: planned\n---\n# Body\n');
  assert.deepEqual(result.data, { title: 'Hello', status: 'planned' });
  assert.equal(result.body.trim(), '# Body');
});

test('returns null when there is no fence', () => {
  assert.equal(parseFrontmatter('# Just a heading\n'), null);
});

test('returns null when the fence is not at the very start', () => {
  assert.equal(parseFrontmatter('\n\n---\ntitle: x\n---\n'), null);
});

test('tolerates CRLF line endings', () => {
  const result = parseFrontmatter('---\r\ntitle: Hello\r\nstatus: planned\r\n---\r\n# Body\r\n');
  assert.deepEqual(result.data, { title: 'Hello', status: 'planned' });
});

test('keeps colons that appear inside the value', () => {
  const result = parseFrontmatter('---\nspec: docs/specs/a-b.md\ntitle: A: B\n---\n');
  assert.equal(result.data.spec, 'docs/specs/a-b.md');
  assert.equal(result.data.title, 'A: B');
});

test('ignores blank lines and comment lines inside the fence', () => {
  const result = parseFrontmatter('---\ntitle: Hello\n\n# a comment\nstatus: planned\n---\n');
  assert.deepEqual(result.data, { title: 'Hello', status: 'planned' });
});

test('strips surrounding quotes from values', () => {
  const result = parseFrontmatter('---\ntitle: "Hello"\nstatus: \'planned\'\n---\n');
  assert.deepEqual(result.data, { title: 'Hello', status: 'planned' });
});

test('returns empty data for an empty fence', () => {
  const result = parseFrontmatter('---\n---\n# Body\n');
  assert.deepEqual(result.data, {});
});

test('returns null when the closing fence is missing', () => {
  assert.equal(parseFrontmatter('---\ntitle: Hello\n# never closed\n'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/docs/frontmatter.test.js`
Expected: FAIL — `Cannot find module './frontmatter'`

- [ ] **Step 3: Write minimal implementation**

Create `scripts/docs/frontmatter.js`:

```js
'use strict';

const FENCE = /^---[ \t]*\r?\n/;

/**
 * Parse a leading `---` fenced block of flat `key: value` pairs.
 * Deliberately not a YAML parser — the contract in the spec has no nesting or lists.
 *
 * @param {string} content
 * @returns {{ data: Record<string, string>, body: string } | null}
 */
function parseFrontmatter(content) {
  if (!FENCE.test(content)) return null;

  const lines = content.split(/\r?\n/);
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }
  if (closingIndex === -1) return null;

  const data = {};
  for (let i = 1; i < closingIndex; i += 1) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (value.length >= 2 && /^(".*"|'.*')$/.test(value)) {
      value = value.slice(1, -1);
    }
    if (key) data[key] = value;
  }

  return { data, body: lines.slice(closingIndex + 1).join('\n') };
}

module.exports = { parseFrontmatter };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/docs/frontmatter.test.js`
Expected: PASS — 8 tests

- [ ] **Step 5: Commit**

```bash
git add scripts/docs/frontmatter.js scripts/docs/frontmatter.test.js
git commit -m "feat(docs-check): add flat frontmatter parser

Handles CRLF, quoted values, and colons inside values. Deliberately
not a YAML parser - the frontmatter contract is flat key: value only,
which does not justify a dependency at the monorepo root.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Directory walker

**Files:**
- Create: `scripts/docs/walk.js`
- Test: `scripts/docs/walk.test.js`
- Create: `scripts/docs/__fixtures__/walk-basic/` (see Step 1)

**Interfaces:**
- Consumes: nothing.
- Produces: `walkFiles(rootDir: string, extensions: string[]) -> string[]` — paths **relative to `rootDir`**, `/`-separated, sorted. Skips `node_modules`, `.git`, `.next`, `dist`, `build`, `coverage`. Used by Tasks 3, 4, 5.

- [ ] **Step 1: Create the fixture tree**

```bash
mkdir -p scripts/docs/__fixtures__/walk-basic/nested/deeper
mkdir -p scripts/docs/__fixtures__/walk-basic/node_modules
printf '# Top\n' > scripts/docs/__fixtures__/walk-basic/top.md
printf '# Nested\n' > scripts/docs/__fixtures__/walk-basic/nested/mid.md
printf '# Deeper\n' > scripts/docs/__fixtures__/walk-basic/nested/deeper/leaf.md
printf '<html></html>\n' > scripts/docs/__fixtures__/walk-basic/page.html
printf 'not markdown\n' > scripts/docs/__fixtures__/walk-basic/notes.txt
printf '# Should be skipped\n' > scripts/docs/__fixtures__/walk-basic/node_modules/ignored.md
```

- [ ] **Step 2: Write the failing test**

Create `scripts/docs/walk.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { walkFiles } = require('./walk');

const FIXTURE = path.join(__dirname, '__fixtures__', 'walk-basic');

test('finds markdown files recursively, relative and sorted', () => {
  assert.deepEqual(walkFiles(FIXTURE, ['.md']), [
    'nested/deeper/leaf.md',
    'nested/mid.md',
    'top.md',
  ]);
});

test('honours the extension filter', () => {
  assert.deepEqual(walkFiles(FIXTURE, ['.html']), ['page.html']);
});

test('accepts multiple extensions', () => {
  assert.deepEqual(walkFiles(FIXTURE, ['.md', '.html']), [
    'nested/deeper/leaf.md',
    'nested/mid.md',
    'page.html',
    'top.md',
  ]);
});

test('skips ignored directories such as node_modules', () => {
  assert.ok(!walkFiles(FIXTURE, ['.md']).some((p) => p.includes('node_modules')));
});

test('returns an empty array for a directory that does not exist', () => {
  assert.deepEqual(walkFiles(path.join(FIXTURE, 'nope'), ['.md']), []);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/docs/walk.test.js`
Expected: FAIL — `Cannot find module './walk'`

- [ ] **Step 4: Write minimal implementation**

Create `scripts/docs/walk.js`:

```js
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/docs/walk.test.js`
Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add scripts/docs/walk.js scripts/docs/walk.test.js scripts/docs/__fixtures__/walk-basic
git commit -m "feat(docs-check): add shared recursive directory walker

Hand-rolled rather than fs.globSync: engines.node floor is >=20.19.0
and globSync landed in Node 22.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Link checker

**Files:**
- Create: `scripts/docs/check-links.js`
- Test: `scripts/docs/check-links.test.js`
- Create: `scripts/docs/__fixtures__/links-good/`, `scripts/docs/__fixtures__/links-broken/`

**Interfaces:**
- Consumes: `walkFiles` from Task 2.
- Produces: `checkLinks(rootDir) -> Violation[]` with `rule: 'broken-link'`. Also exports `extractLinks(content: string) -> { target: string, line: number }[]` for direct testing.

**Scope note:** scans `docs/**` *including* `archive/`, plus root `README.md`, `CLAUDE.md`, `TECH-VERSIONS.md`. Archived docs are retained so agents can search history — links that 404 defeat that purpose.

- [ ] **Step 1: Create the fixture trees**

```bash
mkdir -p scripts/docs/__fixtures__/links-good/docs/guides
mkdir -p scripts/docs/__fixtures__/links-broken/docs/guides
mkdir -p scripts/docs/__fixtures__/links-broken/docs/deep/nested

# links-good: every link resolves
printf '# Root\n\nSee [guide](docs/guides/setup.md).\n' \
  > scripts/docs/__fixtures__/links-good/README.md
printf '# Setup\n\nBack to [root](../../README.md). External [site](https://example.com).\nMail [us](mailto:a@b.c). Jump to [section](#later).\n' \
  > scripts/docs/__fixtures__/links-good/docs/guides/setup.md

# links-broken: one missing target, one valid, plus an anchored link that resolves
printf '# Root\n\nGood [guide](docs/guides/setup.md).\nBad [gone](docs/guides/missing.md).\n' \
  > scripts/docs/__fixtures__/links-broken/README.md
printf '# Setup\n\nAnchored [root](../../README.md#quick-start).\n' \
  > scripts/docs/__fixtures__/links-broken/docs/guides/setup.md
printf '# Deep\n\nUp two [setup](../../guides/setup.md).\nBroken up [nope](../../guides/nope.md).\n' \
  > scripts/docs/__fixtures__/links-broken/docs/deep/nested/leaf.md
```

- [ ] **Step 2: Write the failing test**

Create `scripts/docs/check-links.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkLinks, extractLinks } = require('./check-links');

const GOOD = path.join(__dirname, '__fixtures__', 'links-good');
const BROKEN = path.join(__dirname, '__fixtures__', 'links-broken');

test('extractLinks finds markdown links with line numbers', () => {
  const links = extractLinks('a\n[one](x.md) and [two](y.html)\n');
  assert.deepEqual(links, [
    { target: 'x.md', line: 2 },
    { target: 'y.html', line: 2 },
  ]);
});

test('extractLinks ignores external, mailto, and bare-anchor targets', () => {
  const links = extractLinks('[a](https://e.com) [b](mailto:x@y.z) [c](#top) [d](k.md)\n');
  assert.deepEqual(links, [{ target: 'k.md', line: 1 }]);
});

test('extractLinks ignores non-doc extensions', () => {
  assert.deepEqual(extractLinks('[img](photo.png) [doc](real.md)\n'), [
    { target: 'real.md', line: 1 },
  ]);
});

test('reports no violations when every link resolves', () => {
  assert.deepEqual(checkLinks(GOOD), []);
});

test('reports each broken link once, with file and line', () => {
  const violations = checkLinks(BROKEN);
  assert.equal(violations.length, 2);
  assert.ok(violations.every((v) => v.rule === 'broken-link'));

  const byFile = Object.fromEntries(violations.map((v) => [v.file, v]));
  assert.ok(byFile['README.md']);
  assert.equal(byFile['README.md'].line, 4);
  assert.match(byFile['README.md'].message, /docs\/guides\/missing\.md/);
  assert.ok(byFile['docs/deep/nested/leaf.md']);
});

test('strips the anchor fragment before resolving', () => {
  const violations = checkLinks(BROKEN);
  assert.ok(!violations.some((v) => v.message.includes('#quick-start')));
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/docs/check-links.test.js`
Expected: FAIL — `Cannot find module './check-links'`

- [ ] **Step 4: Write minimal implementation**

Create `scripts/docs/check-links.js`:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkFiles } = require('./walk');

const LINK_REGEX = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CHECKED_EXTENSIONS = new Set(['.md', '.html']);
const ROOT_DOCS = ['README.md', 'CLAUDE.md', 'TECH-VERSIONS.md'];

/**
 * Extract relative doc links worth checking, with 1-based line numbers.
 * Skips external schemes, bare anchors, and non-doc extensions.
 *
 * @param {string} content
 * @returns {{ target: string, line: number }[]}
 */
function extractLinks(content) {
  const lines = content.split(/\r?\n/);
  const links = [];

  for (let i = 0; i < lines.length; i += 1) {
    let match;
    LINK_REGEX.lastIndex = 0;
    while ((match = LINK_REGEX.exec(lines[i])) !== null) {
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/docs/check-links.test.js`
Expected: PASS — 6 tests

- [ ] **Step 6: Sanity-check against the real repo**

Run: `node -e "console.log(require('./scripts/docs/check-links').checkLinks(process.cwd()).length)"`
Expected: **115**. This confirms the checker sees the real drift. Do **not** fix anything yet — that is Task 8.

> **Measurement note.** An early shell-based estimate said 157, and a first cut of the
> checker said 173. Both were inflated: they counted illustrative links inside fenced
> code blocks, of which this repo's plans and guides have many. `extractLinks` skips
> fenced blocks and inline code spans, which is why the real figure is 115 across 30
> files. If you get 173, fence skipping has regressed.

- [ ] **Step 7: Commit**

```bash
git add scripts/docs/check-links.js scripts/docs/check-links.test.js scripts/docs/__fixtures__/links-good scripts/docs/__fixtures__/links-broken
git commit -m "feat(docs-check): add relative link checker

Validates every relative .md/.html link across docs/ (archive included)
plus the three root docs. Strips anchors before resolving; skips
external schemes. Reports 115 pre-existing violations on this tree.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Lifecycle checker

**Files:**
- Create: `scripts/docs/check-lifecycle.js`
- Test: `scripts/docs/check-lifecycle.test.js`
- Create: `scripts/docs/__fixtures__/lifecycle-good/`, `scripts/docs/__fixtures__/lifecycle-bad/`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 1), `walkFiles` (Task 2).
- Produces: `checkLifecycle(rootDir) -> Violation[]` with rules `missing-frontmatter`, `invalid-status`, `unarchived-terminal`, `archived-non-terminal`. Also exports `VALID_STATUSES` and `TERMINAL_STATUSES` (both `Set<string>`) — Task 9 reuses them.

- [ ] **Step 1: Create the fixture trees**

```bash
mkdir -p scripts/docs/__fixtures__/lifecycle-good/docs/plans/active
mkdir -p scripts/docs/__fixtures__/lifecycle-good/docs/specs
mkdir -p scripts/docs/__fixtures__/lifecycle-good/docs/archive/plans
mkdir -p scripts/docs/__fixtures__/lifecycle-bad/docs/plans/active
mkdir -p scripts/docs/__fixtures__/lifecycle-bad/docs/specs
mkdir -p scripts/docs/__fixtures__/lifecycle-bad/docs/archive/plans

# good
printf -- '---\ntitle: A\nstatus: planned\ncreated: 2026-01-01\n---\n# A\n' \
  > scripts/docs/__fixtures__/lifecycle-good/docs/plans/active/a.md
printf -- '---\ntitle: T\nstatus: planned\ncreated: 2026-01-01\n---\n# T\n' \
  > scripts/docs/__fixtures__/lifecycle-good/docs/plans/_template.md
printf -- '---\ntitle: S\nstatus: in-progress\ncreated: 2026-01-01\n---\n# S\n' \
  > scripts/docs/__fixtures__/lifecycle-good/docs/specs/s.md
printf -- '---\ntitle: Old\nstatus: implemented\ncreated: 2025-01-01\n---\n# Old\n' \
  > scripts/docs/__fixtures__/lifecycle-good/docs/archive/plans/old.md

# bad: one of each violation
printf '# No frontmatter at all\n' \
  > scripts/docs/__fixtures__/lifecycle-bad/docs/plans/active/no-fm.md
printf -- '---\ntitle: B\nstatus: nonsense\ncreated: 2026-01-01\n---\n# B\n' \
  > scripts/docs/__fixtures__/lifecycle-bad/docs/plans/active/bad-status.md
printf -- '---\ntitle: C\nstatus: implemented\ncreated: 2026-01-01\n---\n# C\n' \
  > scripts/docs/__fixtures__/lifecycle-bad/docs/plans/active/done-but-here.md
printf -- '---\ntitle: D\nstatus: planned\ncreated: 2026-01-01\n---\n# D\n' \
  > scripts/docs/__fixtures__/lifecycle-bad/docs/archive/plans/still-planned.md
```

- [ ] **Step 2: Write the failing test**

Create `scripts/docs/check-lifecycle.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkLifecycle, VALID_STATUSES, TERMINAL_STATUSES } = require('./check-lifecycle');

const GOOD = path.join(__dirname, '__fixtures__', 'lifecycle-good');
const BAD = path.join(__dirname, '__fixtures__', 'lifecycle-bad');

const rulesFor = (root) => checkLifecycle(root).map((v) => v.rule).sort();

test('exports the documented status vocabulary', () => {
  assert.deepEqual([...VALID_STATUSES].sort(), [
    'abandoned', 'implemented', 'in-progress', 'planned',
  ]);
  assert.deepEqual([...TERMINAL_STATUSES].sort(), ['abandoned', 'implemented']);
});

test('reports no violations for a well-formed tree', () => {
  assert.deepEqual(checkLifecycle(GOOD), []);
});

test('exempts plans/_template.md from the frontmatter requirement', () => {
  assert.ok(!checkLifecycle(GOOD).some((v) => v.file.includes('_template')));
});

test('flags a plan with no frontmatter', () => {
  const v = checkLifecycle(BAD).find((x) => x.file.endsWith('no-fm.md'));
  assert.equal(v.rule, 'missing-frontmatter');
});

test('flags an unrecognised status value', () => {
  const v = checkLifecycle(BAD).find((x) => x.file.endsWith('bad-status.md'));
  assert.equal(v.rule, 'invalid-status');
  assert.match(v.message, /nonsense/);
});

test('flags a terminal status outside archive/', () => {
  const v = checkLifecycle(BAD).find((x) => x.file.endsWith('done-but-here.md'));
  assert.equal(v.rule, 'unarchived-terminal');
  assert.match(v.message, /archive/);
});

test('flags a non-terminal status inside archive/', () => {
  const v = checkLifecycle(BAD).find((x) => x.file.endsWith('still-planned.md'));
  assert.equal(v.rule, 'archived-non-terminal');
});

test('finds exactly the four seeded violations', () => {
  assert.deepEqual(rulesFor(BAD), [
    'archived-non-terminal',
    'invalid-status',
    'missing-frontmatter',
    'unarchived-terminal',
  ]);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/docs/check-lifecycle.test.js`
Expected: FAIL — `Cannot find module './check-lifecycle'`

- [ ] **Step 4: Write minimal implementation**

Create `scripts/docs/check-lifecycle.js`:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkFiles } = require('./walk');
const { parseFrontmatter } = require('./frontmatter');

const VALID_STATUSES = new Set(['planned', 'in-progress', 'implemented', 'abandoned']);
const TERMINAL_STATUSES = new Set(['implemented', 'abandoned']);

// Directories whose .md files must carry lifecycle frontmatter.
const TRACKED_DIRS = ['docs/plans', 'docs/specs', 'docs/archive'];
const EXEMPT = new Set(['docs/plans/_template.md']);

/**
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/docs/check-lifecycle.test.js`
Expected: PASS — 8 tests

- [ ] **Step 6: Commit**

```bash
git add scripts/docs/check-lifecycle.js scripts/docs/check-lifecycle.test.js scripts/docs/__fixtures__/lifecycle-good scripts/docs/__fixtures__/lifecycle-bad
git commit -m "feat(docs-check): add plan/spec lifecycle checker

Enforces the archive invariant: status implemented/abandoned must live
under docs/archive/, and archived files must not be planned/in-progress.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Index checker

**Files:**
- Create: `scripts/docs/check-index.js`
- Test: `scripts/docs/check-index.test.js`
- Create: `scripts/docs/__fixtures__/index-good/`, `scripts/docs/__fixtures__/index-bad/`

**Interfaces:**
- Consumes: `walkFiles` (Task 2).
- Produces: `checkIndex(rootDir) -> Violation[]` with rules `index-orphan` (doc exists but INDEX does not mention it) and `index-dangling` (INDEX mentions a path that does not exist).

**Exemption rule (from spec §7.2):** a doc is exempt from the orphan check if it is `docs/INDEX.md` itself, lives under `docs/archive/`, or has **any** path segment starting with `_` (covers `plans/_template.md` and `wireframes/_prototypes/**`).

- [ ] **Step 1: Create the fixture trees**

```bash
mkdir -p scripts/docs/__fixtures__/index-good/docs/guides
mkdir -p scripts/docs/__fixtures__/index-good/docs/archive/plans
mkdir -p scripts/docs/__fixtures__/index-good/docs/plans
mkdir -p scripts/docs/__fixtures__/index-good/docs/wireframes/_prototypes
mkdir -p scripts/docs/__fixtures__/index-bad/docs/guides

printf '# Index\n\n- [guides/a.md](guides/a.md) - thing\n' \
  > scripts/docs/__fixtures__/index-good/docs/INDEX.md
printf '# A\n' > scripts/docs/__fixtures__/index-good/docs/guides/a.md
printf '# Archived\n' > scripts/docs/__fixtures__/index-good/docs/archive/plans/old.md
printf '# Template\n' > scripts/docs/__fixtures__/index-good/docs/plans/_template.md
printf '# Proto\n' > scripts/docs/__fixtures__/index-good/docs/wireframes/_prototypes/p.md

# bad: b.md is an orphan; gone.md is dangling
printf '# Index\n\n- [guides/a.md](guides/a.md) - thing\n- [guides/gone.md](guides/gone.md) - missing\n' \
  > scripts/docs/__fixtures__/index-bad/docs/INDEX.md
printf '# A\n' > scripts/docs/__fixtures__/index-bad/docs/guides/a.md
printf '# B\n' > scripts/docs/__fixtures__/index-bad/docs/guides/b.md
```

- [ ] **Step 2: Write the failing test**

Create `scripts/docs/check-index.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkIndex } = require('./check-index');

const GOOD = path.join(__dirname, '__fixtures__', 'index-good');
const BAD = path.join(__dirname, '__fixtures__', 'index-bad');

test('reports nothing when INDEX covers every non-exempt doc', () => {
  assert.deepEqual(checkIndex(GOOD), []);
});

test('exempts archive/, INDEX.md itself, and underscore-prefixed segments', () => {
  const files = checkIndex(GOOD).map((v) => v.file);
  assert.deepEqual(files, []);
});

test('flags a doc that INDEX never mentions', () => {
  const v = checkIndex(BAD).find((x) => x.rule === 'index-orphan');
  assert.equal(v.file, 'docs/guides/b.md');
  assert.match(v.message, /INDEX/);
});

test('flags an INDEX entry whose target does not exist', () => {
  const v = checkIndex(BAD).find((x) => x.rule === 'index-dangling');
  assert.equal(v.file, 'docs/INDEX.md');
  assert.match(v.message, /guides\/gone\.md/);
  assert.ok(v.line > 0);
});

test('finds exactly the two seeded violations', () => {
  assert.equal(checkIndex(BAD).length, 2);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/docs/check-index.test.js`
Expected: FAIL — `Cannot find module './check-index'`

- [ ] **Step 4: Write minimal implementation**

Create `scripts/docs/check-index.js`:

```js
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { walkFiles } = require('./walk');

const INDEX_PATH = 'docs/INDEX.md';
const LINK_REGEX = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/**
 * A doc is exempt from the orphan check when it is INDEX itself, lives under
 * docs/archive/, or has any path segment starting with "_".
 * The underscore rule is the general escape hatch (see spec section 7.2).
 *
 * @param {string} relPath repo-relative, "/"-separated
 */
function isExempt(relPath) {
  if (relPath === INDEX_PATH) return true;
  if (relPath.startsWith('docs/archive/')) return true;
  return relPath.split('/').some((segment) => segment.startsWith('_'));
}

/**
 * @param {string} rootDir repo root
 * @returns {{ rule: string, file: string, line?: number, message: string }[]}
 */
function checkIndex(rootDir) {
  const indexAbsolute = path.join(rootDir, INDEX_PATH);
  if (!fs.existsSync(indexAbsolute)) {
    return [{ rule: 'index-dangling', file: INDEX_PATH, message: 'docs/INDEX.md is missing' }];
  }

  const indexContent = fs.readFileSync(indexAbsolute, 'utf8');
  const indexLines = indexContent.split(/\r?\n/);
  const violations = [];

  // Collect every relative target INDEX mentions, keyed by repo-relative path.
  const mentioned = new Set();
  const indexDir = path.dirname(indexAbsolute);

  for (let i = 0; i < indexLines.length; i += 1) {
    let match;
    LINK_REGEX.lastIndex = 0;
    while ((match = LINK_REGEX.exec(indexLines[i])) !== null) {
      const target = match[1];
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#')) continue;

      const withoutAnchor = decodeURIComponent(target.split('#')[0]);
      if (!withoutAnchor) continue;

      const absolute = path.resolve(indexDir, withoutAnchor);
      const relative = path.relative(rootDir, absolute).replace(/\\/g, '/');
      mentioned.add(relative);

      if (!fs.existsSync(absolute)) {
        violations.push({
          rule: 'index-dangling',
          file: INDEX_PATH,
          line: i + 1,
          message: `${withoutAnchor} does not exist`,
        });
      }
    }
  }

  // Every non-exempt doc must be mentioned.
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/docs/check-index.test.js`
Expected: PASS — 5 tests

- [ ] **Step 6: Commit**

```bash
git add scripts/docs/check-index.js scripts/docs/check-index.test.js scripts/docs/__fixtures__/index-good scripts/docs/__fixtures__/index-bad
git commit -m "feat(docs-check): add bidirectional INDEX completeness checker

Every non-exempt doc must appear in INDEX; every INDEX path must exist.
Exemptions are a rule, not a list: INDEX itself, archive/, and any
underscore-prefixed path segment.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: CLI entrypoint and npm wiring

**Files:**
- Create: `scripts/docs/index.js`
- Test: `scripts/docs/index.test.js`
- Modify: `package.json` (scripts block, lines 2–29)

**Interfaces:**
- Consumes: `checkLinks` (Task 3), `checkLifecycle` (Task 4), `checkIndex` (Task 5).
- Produces: `formatViolations(violations) -> string` and `runAllChecks(rootDir) -> Violation[]`. CLI exits `0` clean / `1` on any violation.

- [ ] **Step 1: Write the failing test**

Create `scripts/docs/index.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { formatViolations, runAllChecks } = require('./index');

test('formats a clean run', () => {
  assert.match(formatViolations([]), /0 violations|clean/i);
});

test('groups violations by rule and shows file:line', () => {
  const output = formatViolations([
    { rule: 'broken-link', file: 'docs/a.md', line: 12, message: 'x.md does not exist' },
    { rule: 'broken-link', file: 'docs/b.md', line: 3, message: 'y.md does not exist' },
    { rule: 'index-orphan', file: 'docs/c.md', message: 'not referenced in docs/INDEX.md' },
  ]);

  assert.match(output, /broken-link \(2\)/);
  assert.match(output, /index-orphan \(1\)/);
  assert.match(output, /docs\/a\.md:12/);
  assert.match(output, /docs\/c\.md/);
  assert.match(output, /3 violations/);
});

test('runAllChecks aggregates all three checkers on a clean fixture', () => {
  const clean = path.join(__dirname, '__fixtures__', 'all-clean');
  assert.deepEqual(runAllChecks(clean), []);
});
```

- [ ] **Step 2: Create the `all-clean` fixture**

```bash
mkdir -p scripts/docs/__fixtures__/all-clean/docs/guides
printf '# Index\n\n- [guides/a.md](guides/a.md) - a guide\n' \
  > scripts/docs/__fixtures__/all-clean/docs/INDEX.md
printf '# A\n\nSee [the index](../INDEX.md).\n' \
  > scripts/docs/__fixtures__/all-clean/docs/guides/a.md
```

- [ ] **Step 3: Run test to verify it fails**

Run: `node --test scripts/docs/index.test.js`
Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 4: Write minimal implementation**

Create `scripts/docs/index.js`:

```js
#!/usr/bin/env node
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

if (require.main === module) {
  const violations = runAllChecks(process.cwd());
  const output = formatViolations(violations);

  if (violations.length > 0) {
    console.error(output);
    process.exit(1);
  }
  console.log(output);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/docs/index.test.js`
Expected: PASS — 3 tests

- [ ] **Step 6: Wire up npm scripts**

In `package.json`, add these two entries immediately after the `"lint:guards"` line, and change the `"test"` line as shown. Leave `"test:ci"` untouched — the existing `unit_tests` CI job must not change.

```json
    "test": "npm run docs:test && npm run test --workspaces --if-present",
    "docs:check": "node scripts/docs/index.js",
    "docs:test": "node --test scripts/docs/",
```

- [ ] **Step 7: Verify the whole suite and the CLI**

```bash
npm run docs:test
node scripts/docs/index.js; echo "exit=$?"
```

Expected: `docs:test` passes (~35 tests across 6 files). The CLI prints grouped violations and `exit=1` — the repo is still dirty; Tasks 7–12 fix that.

- [ ] **Step 8: Commit**

```bash
git add scripts/docs/index.js scripts/docs/index.test.js scripts/docs/__fixtures__/all-clean package.json
git commit -m "feat(docs-check): add CLI entrypoint and npm scripts

docs:test joins the root test chain; test:ci is left untouched so the
existing unit_tests CI job is unchanged. docs:check stays out of both
chains - it validates repo content, not code.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Structural moves

**Files:**
- Move: `wireframe/` → `docs/wireframes/_prototypes/`
- Modify: `.gitignore`
- Remove from index: `repomix-output.xml`

- [ ] **Step 1: Relocate the prototype wireframes**

```bash
git mv wireframe docs/wireframes/_prototypes
```

- [ ] **Step 2: Confirm nothing linked to the old location**

Run: `git grep -n "](\.\./\.\./wireframe/\|](/wireframe/\|(wireframe/" -- '*.md' || echo "no references"`
Expected: `no references`. If any appear, repoint them to `docs/wireframes/_prototypes/` before continuing.

- [ ] **Step 3: Untrack the generated repomix artifact**

Append to `.gitignore`:

```gitignore

# Generated repo digests
repomix-output.xml
```

Then:

```bash
git rm --cached repomix-output.xml
```

- [ ] **Step 4: Verify**

```bash
git status --short
git check-ignore repomix-output.xml && echo "ignored OK"
ls docs/wireframes/_prototypes/
```

Expected: `repomix-output.xml` shows as deleted from the index but still present on disk; `ignored OK` prints; three prototype folders listed.

- [ ] **Step 5: Commit**

```bash
git add .gitignore
git commit -m "chore(docs): relocate prototype wireframes, untrack repomix output

Root wireframe/ was invisible to INDEX and duplicated the concept of
docs/wireframes/ without its conventions. The underscore prefix marks
it exempt from the index check.

repomix-output.xml is a generated artifact that was tracked; it is now
ignored and untracked. The file stays on disk.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Fix the 115 broken links

**Files:** many under `docs/` — driven by checker output, not by a fixed list.

**This task requires judgment and must not be done with a blind find-replace.** Three distinct causes, three distinct fixes.

- [ ] **Step 1: Produce the working list**

```bash
node -e "
const {checkLinks}=require('./scripts/docs/check-links');
const v=checkLinks(process.cwd());
console.log(v.length+' broken links');
const byFile={};
for(const x of v){(byFile[x.file] ||= []).push(x.line+': '+x.message);}
for(const [f,ls] of Object.entries(byFile)) console.log('\n'+f+'\n  '+ls.join('\n  '));
" > /tmp/broken-links.txt; head -60 /tmp/broken-links.txt
```

- [ ] **Step 2: Fix category A — the flat-path wireframe/journey links**

**Cause:** the April reorg moved `docs/wireframes/09-post-detail.md` to `docs/wireframes/09-post-detail/09-post-detail.md` but left the links inside pointing at siblings by the old flat name.

**Rule:** a link `./NN-name.md` from inside `docs/wireframes/MM-other/` becomes `../NN-name/NN-name.md`.

Verify one by hand before applying the pattern:

```bash
grep -n "08-message-thread.md" docs/wireframes/09-post-detail/09-post-detail.md
ls docs/wireframes/08-message-thread/
```

Apply per-file, then re-run the checker after each few files to watch the count fall.

- [ ] **Step 3: Fix category B — links to docs that moved folders**

Examples from the audit: `../code-sharing-guide.md` → `../../guides/code-sharing.md`; `../monorepo-structure.md` → `../../architecture/monorepo-structure.md`; `../database-schema.md` → `../../architecture/database-schema.md`; `../../docs/product/roadmap.md` → `../roadmap.md` (the `docs/` segment is doubled).

For each, resolve the intended target by filename and repoint. Confirm the target exists before editing:

```bash
find docs -name "code-sharing.md" -o -name "monorepo-structure.md" -o -name "database-schema.md"
```

- [ ] **Step 4: Fix category C — links to docs that never existed**

**These must be removed, not repointed.** Chief case: `docs/user-journeys/README.md` links 10 journeys that were never written. Deleting the link is correct; inventing the doc is out of scope. Handled fully in Task 9 for that file. For any other category-C link, convert the markdown link to plain text and note the gap in the surrounding prose.

Identify them by confirming no candidate file exists anywhere:

```bash
find docs -name "07-browse-and-search.md"   # expect: no output
```

- [ ] **Step 5: Verify the count is zero**

Run: `node -e "console.log(require('./scripts/docs/check-links').checkLinks(process.cwd()).length)"`
Expected: `0`

- [ ] **Step 6: Commit**

```bash
git add docs
git commit -m "fix(docs): repair 115 broken internal links

Three causes: (a) wireframes and journeys still using pre-reorg flat
sibling paths, (b) links to docs that changed folders in the April
reorg, (c) links to docs that were never written - those are removed
rather than repointed.

The April reorg used git mv correctly but never rewrote links inside
the moved files, and nothing checked for five months.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Plan and spec lifecycle audit

**Files:**
- Modify: all 12 files in `docs/plans/active/`, all 5 in `docs/specs/`
- Move: terminal-status files into `docs/archive/plans/` and `docs/archive/specs/`
- Modify: all files already in `docs/archive/plans/` and `docs/archive/specs/` (add frontmatter)

**This task requires reading each plan against the actual code. Do not assume a status.**

- [ ] **Step 1: Add frontmatter to the four known-terminal files and archive them**

These four have their status already established by the spec's audit (§10 items 2 and 4):

| File | Status | Destination |
|---|---|---|
| `plans/active/2026-04-20-pr2-metro-pulse.md` | `implemented` | `archive/plans/` |
| `plans/active/2026-04-20-pr3-helper-score-social-cards.md` | `implemented` | `archive/plans/` |
| `plans/active/2026-04-13-docs-reorganization.md` | `implemented` | `archive/plans/` |
| `plans/active/phase1-remediation-github-issues.md` | `abandoned` | `archive/plans/` |

For each: prepend the frontmatter block, then `git mv`. Example for the first:

```bash
printf -- '---\ntitle: "PR 2: Metro Pulse card strip"\nstatus: implemented\ncreated: 2026-04-20\nspec: docs/specs/2026-04-20-your-community-today-design.md\n---\n\n' \
  | cat - docs/plans/active/2026-04-20-pr2-metro-pulse.md > /tmp/fm.md \
  && mv /tmp/fm.md docs/plans/active/2026-04-20-pr2-metro-pulse.md
git mv docs/plans/active/2026-04-20-pr2-metro-pulse.md docs/archive/plans/
```

`phase1-remediation-github-issues.md` is `abandoned`, not `implemented` — it is superseded by the issue templates in Task 11, and its content was never "built". Add a one-line note under its H1 saying so.

- [ ] **Step 2: Audit the remaining 8 active plans**

For each, read the plan, then check the code for its deliverable before assigning a status. Do not trust the plan's own self-reported text.

| Plan | How to verify |
|---|---|
| `2026-04-13-marketplace-listing-details-enhancement.md` | Look for the Split View listing detail on web + mobile |
| `2026-04-14-mobile-marketplace-redesign.md` | Look for the 4-tab mobile marketplace home |
| `2026-04-20-pr1-social-identity.md` | Look for a follow table in `supabase/migrations/` and follow API in `packages/shared/src/api/` |
| `2026-06-07-postgres-15-to-17-upgrade.md` | Check `supabase/config.toml` for the Postgres major version |
| `marketplace-ux-redesign.md` | Look for the filter bar + featured/recent/trending strips |
| `mobile-usability-security-hardening.md` | Cross-check against migrations 034–036 and `scripts/security/` |
| `notifications-feature.md` | Look for a notifications table and `packages/shared/src/api/notifications.ts` |
| `phase1-remediation-checklist.md` | Read its own checkboxes — it was updated 2026-09-08, so it is genuinely live |

Useful probes:

```bash
ls packages/shared/src/api/
git grep -l "notifications\|follows" -- supabase/migrations/ | head
grep -n "major_version" supabase/config.toml
```

Assign `planned`, `in-progress`, `implemented`, or `abandoned` accordingly. Add frontmatter to every one. `git mv` any that came out terminal.

- [ ] **Step 3: Add frontmatter to the 5 specs**

`docs/specs/2026-09-08-documentation-system-design.md` already has it. For the other four, set `status` to match the plan that implements them, and archive together with that plan:

- `2026-04-13-docs-reorganization-design.md` → `implemented`, archive (superseded by this spec)
- `2026-04-13-marketplace-listing-details-enhancement-design.md` → match its plan
- `2026-04-14-mobile-marketplace-redesign-design.md` → match its plan
- `2026-04-20-your-community-today-design.md` → match PRs 1–3 collectively

- [ ] **Step 4: Add frontmatter to files already in archive**

The 6 existing `archive/plans/` files and 2 `archive/specs/` files need frontmatter with a terminal status, or `check-lifecycle` will flag them as `missing-frontmatter`. Use `status: implemented` and take `created` from the filename date where present, otherwise from `git log --follow --format=%ad --date=short -- <file> | tail -1`.

- [ ] **Step 5: Verify**

Run: `node -e "console.log(JSON.stringify(require('./scripts/docs/check-lifecycle').checkLifecycle(process.cwd()),null,2))"`
Expected: `[]`

- [ ] **Step 6: Commit**

```bash
git add docs
git commit -m "docs(plans): add lifecycle frontmatter and archive finished work

Every plan and spec now carries title/status/created. Four files whose
work is done move to archive/: pr2-metro-pulse and pr3-helper-score
(both self-labelled implemented while still sitting in active/),
the 2026-04-13 docs-reorganization plan and its spec (superseded), and
phase1-remediation-github-issues (abandoned - superseded by real issue
templates).

The remaining plans were each audited against the code rather than
trusting their self-reported status.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Content corrections

**Files:**
- Modify: `docs/user-journeys/README.md`
- Modify: `docs/guides/feature-development.md`
- Modify: `docs/guides/setup-and-testing.md`

- [ ] **Step 1: Rewrite `user-journeys/README.md` to describe reality**

It currently advertises "14 journeys in 6 categories". Seven exist:

```
communication/09-in-app-chat.md
discovery/02-browsing-and-engaging-with-posts.md
discovery/13-event-discovery-and-rsvp.md
location/01-location-permission-and-detection.md
management/14-event-creation-and-management.md
onboarding/01-signup-and-onboarding.md
post-creation/03-creating-a-post.md
```

Replace the index with those seven, and replace the ten dead links with a plain-text **"Not yet documented"** section listing them as gaps — no links:

```markdown
## Not yet documented

These flows are referenced by feature specs but have no journey doc. Listed as
plain text deliberately: linking to files that do not exist is what made this
README misleading for five months.

- Trust level verification (onboarding)
- Housing / job / emergency / travel post creation variants
- Browse and search (discovery)
- Respond to a post (discovery)
- Report content (safety)
- Moderator review (safety)
- Renew / edit post (management)
```

- [ ] **Step 2: Fix the stale references in `feature-development.md`**

Three corrections:

1. Stage 3 names the skill `/wireframe`. The installed skill is `wireframe-old`. Update every occurrence, and add a parenthetical: `(the skill is named wireframe-old; it has not been renamed yet)`.
2. The Stage 4 prompt block writes plans to `docs/archive/plans/events-feature.md` and references `docs/plans/active/_template.md`. Correct these to `docs/plans/active/<name>.md` and `docs/plans/_template.md`.
3. The "Example: Full Prompt Sequence" block has the same `docs/archive/plans/events-feature.md` error. Fix it.

Verify no stale reference survives:

```bash
grep -n "/wireframe \|/wireframe$\|archive/plans/events-feature\|plans/active/_template" docs/guides/feature-development.md
```

- [ ] **Step 3: Add the Definition of Done docs rows**

`feature-development.md`'s Definition of Done ends with `CLAUDE.md "Done" list updated`. Append:

```markdown
- [ ] `npm run docs:check` passes
- [ ] Plan `status:` updated; if complete, `git mv`'d to `docs/archive/plans/`
- [ ] `docs/INDEX.md` updated for any doc added, moved, or retired
```

- [ ] **Step 4: Document the security smoke scripts**

`guides/setup-and-testing.md` never mentions the four `npm run test:security:*` scripts. Add a section:

```markdown
## Security smoke tests

Four scripts assert RLS and privilege behavior against a live Supabase project.
They are **not** part of `npm test` — they need real credentials and they talk to
a real database.

| Command | Asserts |
|---|---|
| `npm run test:security:chat-rls` | Conversation RLS; a user cannot join a conversation as both participants |
| `npm run test:security:users-privilege` | Migration 034's guard on privileged `users` columns |
| `npm run test:security:users-pii` | PII columns on `users` are readable only by the owner |
| `npm run test:security:emergency-post` | Emergency-tag posts require moderator approval |

Credentials come from `scripts/.env` — copy `scripts/.env.example` and fill it in.
Run them after any migration that touches RLS policies on `users`, `conversations`,
or `posts`.
```

- [ ] **Step 5: Verify**

Run: `node -e "console.log(require('./scripts/docs/check-links').checkLinks(process.cwd()).length)"`
Expected: `0` (still — the journeys README rewrite removed links rather than adding any)

- [ ] **Step 6: Commit**

```bash
git add docs/user-journeys/README.md docs/guides/feature-development.md docs/guides/setup-and-testing.md
git commit -m "docs: correct journeys README, stale skill refs, undocumented scripts

user-journeys/README.md advertised 14 journeys with 10 dead links; 7
exist. The gap is now stated as plain text rather than as links to
files that were never written.

feature-development.md named a /wireframe skill that is now
wireframe-old, and directed plan output into docs/archive/plans/.

The four test:security:* scripts were documented nowhere.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: The workflow guide, INDEX rebuild, and CLAUDE.md

**Files:**
- Create: `docs/guides/documentation-workflow.md`
- Modify: `docs/INDEX.md`
- Modify: `docs/README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Write `docs/guides/documentation-workflow.md`**

Content, transcribed from spec §9:

````markdown
# Documentation Workflow

**Last Updated:** 2026-09-08

How documentation stays current in this repo, and what happens if it does not.

## The short version

Some documentation rules are **enforced by CI** and cannot be skipped. Others are
**prompts in the PR template** and rely on you. This guide is explicit about which
is which, because treating a checkbox as an enforcement mechanism is how this
repo accumulated 115 broken links and a three-month-stale index.

Run `npm run docs:check` before you open a PR.

## Trigger matrix

| If you changed... | You must update... | Enforced by |
|---|---|---|
| DB schema / added a migration | `architecture/database-schema.md` | PR template |
| A feature's user-visible behavior | `product/features/<feature>.md` | PR template |
| Setup, deploy, or test commands | The matching `guides/` doc | PR template |
| Monorepo layout or import rules | `architecture/monorepo-structure.md` | PR template |
| Finished a plan or spec | `status: implemented` -> `git mv` to `archive/` -> INDEX | **CI** |
| Made a non-obvious architectural call | New ADR in `decisions/` | PR template |
| Shipped a roadmap item | `product/roadmap.md` | PR template |
| Added, moved, or retired any doc | `INDEX.md` | **CI** |
| Moved a doc other docs link to | The linking docs | **CI** |

## Evergreen vs point-in-time

The single most common filing mistake. Both of these describe features; only one
is kept current.

| | `product/features/<name>.md` | `specs/YYYY-MM-DD-<topic>-design.md` |
|---|---|---|
| Tense | Present - what the feature *is* | Past-dated - what one change *proposed* |
| Lifetime | Evergreen; edited as behavior changes | Frozen at approval |
| On ship | Updated | Archived to `archive/specs/` |
| Answers | "How does marketplace work today?" | "Why did we redesign it in April?" |

When a spec ships, the shipping PR updates the evergreen feature doc **and**
archives the spec.

## Document lifecycle

```
idea -> specs/YYYY-MM-DD-<topic>-design.md          (status: planned)
     -> plans/active/YYYY-MM-DD-<topic>.md          (status: planned -> in-progress)
     -> implementation
     -> product/features/<feature>.md updated       (evergreen doc absorbs the truth)
     -> spec and plan: status: implemented, git mv -> archive/
     -> INDEX.md updated in the same commit
```

## Frontmatter contract

Required on every file in `plans/` and `specs/` (including `archive/`):

```yaml
---
title: Notifications feature
status: planned | in-progress | implemented | abandoned
created: 2026-04-13
spec: docs/specs/2026-04-13-notifications-design.md   # plans only; optional
---
```

**The hard rule:** `status: implemented` or `abandoned` means the file MUST live
under `docs/archive/`. CI fails otherwise.

## What `npm run docs:check` checks

| Rule | Meaning | Fix |
|---|---|---|
| `broken-link` | A relative `.md`/`.html` link does not resolve | Repoint it, or delete it if the target was never written |
| `index-orphan` | A doc exists but `INDEX.md` never mentions it | Add a one-line entry |
| `index-dangling` | `INDEX.md` points at a file that does not exist | Fix or remove the entry |
| `missing-frontmatter` | A plan/spec has no frontmatter block | Add one per the contract above |
| `invalid-status` | `status:` is not one of the four values | Use a valid value |
| `unarchived-terminal` | `implemented`/`abandoned` outside `archive/` | `git mv` it into `archive/` |
| `archived-non-terminal` | `planned`/`in-progress` inside `archive/` | Fix the status, or move it back to `active/` |

Exempt from `index-orphan`: `INDEX.md` itself, anything under `archive/`, and any
path with an underscore-prefixed segment (`plans/_template.md`,
`wireframes/_prototypes/`). Underscore is the general escape hatch.

## Quarterly freshness sweep

The residue that no script can catch - a guide naming a renamed skill, a wireframe
describing a screen that shipped differently. Open an issue with the
`docs_drift` template each quarter and work this list:

- [ ] Re-read every `guides/` doc against current tooling; verify every skill and command named still exists.
- [ ] Verify `TECH-VERSIONS.md` against `package.json` across all three workspaces.
- [ ] Verify `architecture/database-schema.md` against the highest-numbered file in `supabase/migrations/`.
- [ ] Confirm `product/roadmap.md` phase status matches what has shipped.
- [ ] Stamp `Last verified: YYYY-MM-DD` in `INDEX.md`.

Deliberately human and deliberately small - five checks, so it stays cheap enough
to actually do.
````

- [ ] **Step 2: Rebuild `INDEX.md`**

- Add: `guides/documentation-workflow.md`, `architecture/migration-workflow.md`, `specs/2026-09-08-documentation-system-design.md`, `plans/active/2026-09-08-documentation-system.md`, and a `wireframes/_prototypes/` line under Wireframes.
- Move `plans/active/2026-04-13-marketplace-listing-details-enhancement.md` out of the **Specs** section into **Plans**.
- Remove entries for the four files archived in Task 9.
- Delete every inline `[status: ...]` marker — status now lives in frontmatter, and duplicating it here is exactly the two-places problem this work exists to remove.
- Update `**Last verified:**` to `2026-09-08`.
- Change the header note to point at the workflow guide and mention CI enforcement.

- [ ] **Step 3: Update `docs/README.md`**

- Add `guides/documentation-workflow.md` to the folder table.
- Replace the "Adding a new doc" section with a pointer to the workflow guide plus `npm run docs:check`.
- Replace the "Document status labels" section with the four frontmatter statuses (`planned`, `in-progress`, `implemented`, `abandoned`) — the current five prose labels (Draft / In Review / Approved / Implemented / Deprecated) do not match what CI enforces.
- Add the evergreen vs point-in-time table from §5.2.

- [ ] **Step 4: Update `CLAUDE.md`**

Replace the "Rules for keeping the index honest" bullets under **Finding Docs** with:

```markdown
Rules for keeping the index honest (the first three are CI-enforced — `npm run docs:check`):
- Adding, moving, or retiring a doc? Update `docs/INDEX.md` in the same commit.
- Moving a doc that others link to? Fix the linking docs — broken relative links fail CI.
- Finishing a plan or spec? Set `status: implemented` in its frontmatter and `git mv` it to `docs/archive/`.
- Feature behavior lives in `docs/product/features/` (evergreen). One change's design lives in `docs/specs/` (dated, archived on ship).
- The full procedure, including the trigger matrix for which doc to update when, is [docs/guides/documentation-workflow.md](./docs/guides/documentation-workflow.md).
- Superpowers brainstorming/writing-plans: save specs to `docs/specs/` and plans to `docs/plans/active/` (not `docs/superpowers/...`).
```

- [ ] **Step 5: Verify the whole checker suite is green**

```bash
npm run docs:check; echo "exit=$?"
```

Expected: `docs:check - clean, 0 violations.` and `exit=0`.

**This is the acceptance gate for the entire cleanup.** If it is not zero, do not proceed to Task 12 — CI would go red on the introducing PR.

- [ ] **Step 6: Commit**

```bash
git add docs CLAUDE.md
git commit -m "docs: add documentation workflow guide, rebuild INDEX

The SOP now lives in one place with an explicit trigger matrix that
marks which rows are CI-enforced and which are only PR-template
prompts. INDEX drops inline [status: ...] markers - status lives in
frontmatter now, and duplicating it here was the same two-places
problem that let it go stale.

docs:check is now clean: 0 violations.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: GitHub configuration

**Files:**
- Create: `.github/workflows/docs.yml`
- Create: `.github/CODEOWNERS`
- Create: `.github/ISSUE_TEMPLATE/{bug_report,feature_request,security_finding,docs_drift,config}.yml`
- Modify: `.github/pull_request_template.md`

- [ ] **Step 1: Create the docs workflow**

`.github/workflows/docs.yml` — reuses `ci-job.yml` so Node version, npm caching, and timeout stay in one place:

```yaml
name: Docs

on:
  pull_request:
    branches:
      - master
    paths:
      - '**/*.md'
      - 'docs/**'
      - 'scripts/docs/**'
      - '.github/workflows/docs.yml'
  push:
    branches:
      - master
    paths:
      - '**/*.md'
      - 'docs/**'
      - 'scripts/docs/**'

jobs:
  docs_test:
    name: Docs checker tests
    uses: ./.github/workflows/ci-job.yml
    with:
      command: npm run docs:test

  docs_check:
    name: Docs check
    uses: ./.github/workflows/ci-job.yml
    with:
      command: npm run docs:check
```

- [ ] **Step 2: Add the Documentation section to the PR template**

Insert immediately after the `## Scope` block in `.github/pull_request_template.md`:

```markdown
## Documentation

- [ ] `npm run docs:check` passes.
- [ ] `docs/INDEX.md` updated if any doc was added, moved, or retired.
- [ ] Feature behavior change reflected in `docs/product/features/<feature>.md`.
- [ ] Schema change reflected in `docs/architecture/database-schema.md`.
- [ ] Completed plan/spec: `status:` set to `implemented` and file `git mv`'d to `docs/archive/`.
- [ ] Non-obvious architectural decision recorded as an ADR in `docs/decisions/`.
- [ ] `docs/product/roadmap.md` updated if a roadmap item shipped.

See [docs/guides/documentation-workflow.md](../docs/guides/documentation-workflow.md).
```

- [ ] **Step 3: Create `.github/CODEOWNERS`**

```
# Default owner for everything.
*                        @shashesh

# Areas where an agent-authored PR must not land without human review.
/docs/                   @shashesh
/.github/                @shashesh
/supabase/migrations/    @shashesh
/packages/shared/        @shashesh
```

- [ ] **Step 4: Create the issue forms**

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Documentation index
    url: https://github.com/shashesh/nepally/blob/master/docs/INDEX.md
    about: Every doc in this repo with a one-line purpose. Search here first.
```

`.github/ISSUE_TEMPLATE/bug_report.yml`:

```yaml
name: Bug report
description: Something behaves incorrectly.
labels: [bug]
body:
  - type: dropdown
    id: surface
    attributes:
      label: Surface
      options: [Mobile (Expo), Web (Next.js), Shared package, Supabase / database, CI]
    validations: { required: true }
  - type: textarea
    id: steps
    attributes:
      label: Steps to reproduce
      placeholder: |
        1. Sign in as a Level 0 user
        2. Open the marketplace tab
        3. ...
    validations: { required: true }
  - type: textarea
    id: expected
    attributes:
      label: Expected vs actual
    validations: { required: true }
  - type: input
    id: trust_level
    attributes:
      label: Trust level of the account, if relevant
      placeholder: Level 0 / 1 / 2
```

`.github/ISSUE_TEMPLATE/feature_request.yml`:

```yaml
name: Feature request
description: Propose new functionality.
labels: [enhancement]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What can a community member not do today?
    validations: { required: true }
  - type: textarea
    id: proposal
    attributes:
      label: Proposed solution
    validations: { required: true }
  - type: checkboxes
    id: surfaces
    attributes:
      label: Affected surfaces
      options:
        - label: Mobile
        - label: Web
        - label: Shared package
        - label: Database / RLS
  - type: input
    id: phase
    attributes:
      label: Roadmap phase
      placeholder: See docs/product/roadmap.md
```

`.github/ISSUE_TEMPLATE/security_finding.yml`:

```yaml
name: Security finding
description: A privilege, RLS, or data-exposure problem.
labels: [security]
body:
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options: [Critical - data exposed now, High - exploitable, Medium - defence in depth, Low - hardening]
    validations: { required: true }
  - type: input
    id: surface
    attributes:
      label: Affected table, policy, or function
      placeholder: e.g. public.users - RLS SELECT policy
    validations: { required: true }
  - type: textarea
    id: detail
    attributes:
      label: What is exposed, and how
    validations: { required: true }
  - type: checkboxes
    id: smoke
    attributes:
      label: Verification
      options:
        - label: A smoke test in scripts/security/ covers this
        - label: A new migration is required
```

`.github/ISSUE_TEMPLATE/docs_drift.yml`:

```yaml
name: Documentation drift
description: A doc is wrong, stale, or missing. Also used for the quarterly sweep.
labels: [documentation]
body:
  - type: input
    id: path
    attributes:
      label: Doc path
      placeholder: docs/guides/feature-development.md
    validations: { required: true }
  - type: textarea
    id: wrong
    attributes:
      label: What is wrong
    validations: { required: true }
  - type: textarea
    id: correct
    attributes:
      label: What it should say
  - type: checkboxes
    id: sweep
    attributes:
      label: Quarterly sweep
      options:
        - label: This is the quarterly freshness sweep (see docs/guides/documentation-workflow.md)
```

- [ ] **Step 5: Validate the YAML parses**

```bash
node -e "
const fs=require('fs');
for (const f of fs.readdirSync('.github/ISSUE_TEMPLATE')) {
  const t=fs.readFileSync('.github/ISSUE_TEMPLATE/'+f,'utf8');
  if(!t.trim()) throw new Error('empty: '+f);
  console.log('ok', f, t.split(/\r?\n/).length+' lines');
}"
```

Expected: five files listed. GitHub validates the schema itself on push; a malformed form surfaces as a repo warning.

- [ ] **Step 6: Confirm docs:check still passes with the new files**

```bash
npm run docs:check; echo "exit=$?"
```

Expected: `exit=0`. The new `.github/` files are not under `docs/`, so they do not affect the index check; the PR template's relative link to the workflow guide is not scanned either (only `docs/**` and the three root docs are).

- [ ] **Step 7: Commit**

```bash
git add .github
git commit -m "ci(docs): add docs workflow, issue templates, CODEOWNERS

docs.yml reuses ci-job.yml so Node version and caching stay in one
place; the path filter lives in the caller, which is the only part
ci-job.yml cannot express. Blocking from the start - the cleanup in
this branch leaves docs:check green.

Issue forms replace the hand-written copy-paste issue cards in
phase1-remediation-github-issues.md, which existed only because
templates did not. CODEOWNERS mainly gates copilot-swe-agent PRs on
migrations, shared, and docs.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Full verification

**Files:** none — verification only.

- [ ] **Step 1: Run every gate**

```bash
npm run docs:check;  echo "docs:check   exit=$?"
npm run docs:test;   echo "docs:test    exit=$?"
npm run lint;        echo "lint         exit=$?"
npm run type-check;  echo "type-check   exit=$?"
npm run test;        echo "test         exit=$?"
```

Expected: every one `exit=0`. `npm run test` now runs `docs:test` first — confirm the workspace tests still run after it.

- [ ] **Step 2: Prove the checker actually fails (not vacuously passing)**

A check that has never failed is not known to work.

```bash
printf '\nBroken [link](does-not-exist.md).\n' >> docs/README.md
npm run docs:check; echo "expect exit=1, got exit=$?"
git checkout docs/README.md
npm run docs:check; echo "expect exit=0, got exit=$?"
```

Expected: `exit=1` naming `docs/README.md`, then `exit=0` after revert.

- [ ] **Step 3: Prove the lifecycle rule fires**

```bash
sed -i 's/^status: in-progress$/status: implemented/' docs/plans/active/2026-09-08-documentation-system.md
npm run docs:check; echo "expect exit=1, got exit=$?"
git checkout docs/plans/active/2026-09-08-documentation-system.md
```

Expected: `exit=1` with rule `unarchived-terminal` naming this plan.

- [ ] **Step 4: Confirm the branch state**

```bash
git status --short
git log --oneline master..HEAD
git diff --stat master..HEAD | tail -1
```

Expected: clean tree, ~9 commits, and a large diffstat dominated by link fixes.

- [ ] **Step 5: Mark this plan implemented and archive it**

The plan's own closing move — and a live test of the rule it introduces.

```bash
sed -i 's/^status: in-progress$/status: implemented/' docs/plans/active/2026-09-08-documentation-system.md
git mv docs/plans/active/2026-09-08-documentation-system.md docs/archive/plans/
```

Then update the `docs/INDEX.md` entry for it (Plans section → remove; it is now in archive, which INDEX covers at folder granularity), and set the spec `docs/specs/2026-09-08-documentation-system-design.md` to `status: implemented` and `git mv` it to `docs/archive/specs/`, removing its INDEX entry too.

- [ ] **Step 6: Final green run**

```bash
npm run docs:check; echo "exit=$?"
```

Expected: `exit=0`.

- [ ] **Step 7: Commit**

```bash
git add docs
git commit -m "docs(plans): mark documentation-system plan implemented and archive

Closes the loop the plan introduced: terminal status means the file
lives in archive/, verified by the checker the plan itself added.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 8: Stop. Do not push.**

Per CLAUDE.md, `git push` requires explicit user confirmation. Report the branch, commit count, and diffstat, then wait.

---

## Verification summary

| Gate | Command | Expected |
|---|---|---|
| Checker unit tests | `npm run docs:test` | pass, ~35 tests / 6 files |
| Repo content | `npm run docs:check` | `exit=0`, 0 violations |
| Broken-link count | driven by `checkLinks` | 115 → 0 |
| Lifecycle | `checkLifecycle` | `[]` |
| Index | `checkIndex` | `[]` |
| Existing gates | `npm run lint`, `type-check`, `test` | unchanged, pass |
| Negative test | inject a broken link | `exit=1`, correct file named |
