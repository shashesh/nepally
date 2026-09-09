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

test('flags frontmatter missing required fields even when status is valid', () => {
  const v = checkLifecycle(BAD).find((x) => x.file.endsWith('missing-fields.md'));
  assert.equal(v.rule, 'missing-frontmatter-field');
  assert.match(v.message, /title/);
  assert.match(v.message, /created/);
});

test('finds exactly the five seeded violations', () => {
  assert.deepEqual(rulesFor(BAD), [
    'archived-non-terminal',
    'invalid-status',
    'missing-frontmatter',
    'missing-frontmatter-field',
    'unarchived-terminal',
  ]);
});
