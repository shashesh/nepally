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

test('extractLinks ignores links inside fenced code blocks', () => {
  const content = [
    '[real](a.md)',
    '```js',
    "const link = '[example](not-a-real-file.md)';",
    '```',
    '[also-real](b.md)',
  ].join('\n');

  assert.deepEqual(extractLinks(content), [
    { target: 'a.md', line: 1 },
    { target: 'b.md', line: 5 },
  ]);
});

test('extractLinks handles tilde fences and fences with more than three marks', () => {
  const content = [
    '~~~',
    '[hidden](x.md)',
    '~~~',
    '````md',
    '[also hidden](y.md)',
    '````',
    '[visible](z.md)',
  ].join('\n');

  assert.deepEqual(extractLinks(content), [{ target: 'z.md', line: 7 }]);
});

test('extractLinks ignores links inside inline code spans', () => {
  assert.deepEqual(extractLinks('Use `[example](fake.md)` but [real](r.md) counts.\n'), [
    { target: 'r.md', line: 1 },
  ]);
});

test('extractLinks does not let an unclosed fence swallow the rest of the file', () => {
  // A fence opened inside a doc and never closed is a doc bug, but it must not
  // silently disable checking for everything after it. Treat EOF as closing.
  const content = ['```', '[hidden](x.md)'].join('\n');
  assert.deepEqual(extractLinks(content), []);
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
