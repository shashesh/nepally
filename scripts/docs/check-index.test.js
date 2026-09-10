const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { checkIndex, isExempt } = require('./check-index');

const GOOD = path.join(__dirname, '__fixtures__', 'index-good');
const BAD = path.join(__dirname, '__fixtures__', 'index-bad');

test('reports nothing when INDEX covers every non-exempt doc', () => {
  assert.deepEqual(checkIndex(GOOD), []);
});

test('exempts archive/, INDEX.md itself, and underscore-prefixed segments', () => {
  assert.ok(isExempt('docs/INDEX.md'));
  assert.ok(isExempt('docs/archive/plans/old.md'));
  assert.ok(isExempt('docs/plans/_template.md'));
  assert.ok(isExempt('docs/wireframes/_prototypes/p.md'));
  assert.ok(!isExempt('docs/guides/a.md'));
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
