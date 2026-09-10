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
