const test = require('node:test');
const assert = require('node:assert/strict');
const { checkFiles, findViolations } = require('./guard-css-tokens');

test('flags hex, rgb, hsl and oklch colour literals', () => {
  const css = [
    '.a { color: #fff; }',
    '.b { background: rgba(0, 0, 0, 0.5); }',
    '.c { color: hsl(10 20% 30%); }',
    '.d { color: oklch(50% 0.1 20); }',
  ].join('\n');
  assert.deepEqual(
    findViolations(css).map((violation) => [violation.line, violation.kind]),
    [
      [1, 'colour literal'],
      [2, 'colour literal'],
      [3, 'colour literal'],
      [4, 'colour literal'],
    ]
  );
});

test('flags legacy design-system variables', () => {
  const css = '.a { color: var(--color-primary); padding: var(--space-s); border-radius: var(--radius-md); }';
  assert.deepEqual(
    findViolations(css).map((violation) => violation.kind),
    ['legacy token', 'legacy token', 'legacy token']
  );
});

test('allows semantic tokens, Mantine variables and color-mix over tokens', () => {
  const css = [
    '.a {',
    '  color: var(--text-1);',
    '  padding: var(--space-4);',
    '  border-radius: var(--radius-card);',
    '  font-size: var(--font-size-sm);',
    '  background: color-mix(in oklch, var(--action-bg) 12%, transparent);',
    '  outline-color: var(--mantine-color-ink-8);',
    '}',
  ].join('\n');
  assert.deepEqual(findViolations(css), []);
});

test('flags colour functions written in uppercase', () => {
  const css = ['.a { color: RGB(0 0 0); }', '.b { background: OKLCH(50% 0.1 20); }'].join('\n');
  assert.deepEqual(
    findViolations(css).map((violation) => violation.kind),
    ['colour literal', 'colour literal']
  );
});

test('flags named colours in value position', () => {
  const css = ['.a { color: white; }', '.b { background: Black; }', '.c { border: 1px solid red; }'].join('\n');
  assert.deepEqual(
    findViolations(css).map((violation) => [violation.line, violation.kind]),
    [
      [1, 'named colour'],
      [2, 'named colour'],
      [3, 'named colour'],
    ]
  );
});

test('does not mistake identifiers or filenames for named colours', () => {
  const css = [
    '.whiteBox { color: var(--text-1); }',
    '.a { color: var(--ink-white); }',
    '.b { background: url(black.png); }',
    '.c { background: color-mix(in oklch, var(--action-bg) 12%, transparent); }',
  ].join('\n');
  assert.deepEqual(findViolations(css), []);
});

test('flags primitive tokens, which belong to tokens.css', () => {
  const css = [
    '.a { color: var(--ink-900); }',
    '.b { background: var(--paper-50); }',
    '.c { border-color: var(--crimson-700); }',
  ].join('\n');
  assert.deepEqual(
    findViolations(css).map((violation) => violation.kind),
    ['primitive token', 'primitive token', 'primitive token']
  );
});

test('allows semantic tokens that merely start with a primitive family name', () => {
  const css = '.a { color: var(--accent-ink); border-color: var(--ink-border); }';
  assert.deepEqual(findViolations(css), []);
});

test('ignores colours inside comments but keeps line numbers', () => {
  const css = '/* was\n #fff */\n.a { color: #000; }';
  assert.deepEqual(findViolations(css).map((violation) => violation.line), [3]);
});

test('checkFiles reports one line per violation, naming the file and line', () => {
  const content = ['.a {', '  color: #fff;', '}'].join('\n');
  const errors = checkFiles([{ path: 'apps/web/src/a.module.css', content }]);
  assert.deepEqual(errors, ['apps/web/src/a.module.css:2 colour literal: #fff']);
});

test('checkFiles reports nothing for a clean file', () => {
  assert.deepEqual(checkFiles([{ path: 'apps/web/src/b.module.css', content: '.b { color: var(--text-1); }' }]), []);
});

test('checkFiles reports every offending file, with no allowlist to skip one', () => {
  const errors = checkFiles([
    { path: 'apps/web/src/styles/Old.module.css', content: '.a { color: var(--color-primary); }' },
    { path: 'apps/web/src/c.module.css', content: '.c { color: var(--text-2); }' },
    { path: 'apps/web/src/d.module.css', content: '.d { background: white; }' },
  ]);
  assert.deepEqual(errors, [
    'apps/web/src/styles/Old.module.css:1 legacy token: var(--color-',
    'apps/web/src/d.module.css:1 named colour: white',
  ]);
});
