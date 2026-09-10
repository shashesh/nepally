const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
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
  // Guard against a vacuous pass: .gitignore matches node_modules/ at any
  // depth, so this fixture is force-added. If it ever goes missing the test
  // would silently assert nothing.
  const planted = path.join(FIXTURE, 'node_modules', 'ignored.md');
  assert.ok(fs.existsSync(planted), 'fixture node_modules/ignored.md must exist');

  assert.ok(!walkFiles(FIXTURE, ['.md']).some((p) => p.includes('node_modules')));
});

test('returns an empty array for a directory that does not exist', () => {
  assert.deepEqual(walkFiles(path.join(FIXTURE, 'nope'), ['.md']), []);
});
