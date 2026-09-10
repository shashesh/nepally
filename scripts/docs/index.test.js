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

test('runAllChecks surfaces violations from every checker', () => {
  // links-broken has broken links but no INDEX at all, so the index checker
  // fires too. This proves the aggregator is not silently dropping a checker.
  const broken = path.join(__dirname, '__fixtures__', 'links-broken');
  const rules = new Set(runAllChecks(broken).map((v) => v.rule));

  assert.ok(rules.has('broken-link'));
  assert.ok(rules.has('index-dangling'));
});
