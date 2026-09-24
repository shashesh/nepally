const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MANTINE_COMPONENT_PROPERTIES,
  checkFiles,
  findUndefinedProperties,
  findViolations,
  readTokenNames,
} = require('./guard-css-tokens');

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

test('readTokenNames collects every custom property tokens.css declares', () => {
  const css = ':root {\n  --text-1: #111;\n  --space-4: 1rem;\n}\n[data-theme="dark"] { --text-1: #eee; }';
  assert.deepEqual([...readTokenNames(css)].sort(), ['--space-4', '--text-1']);
});

test('flags a var() whose name is not a token', () => {
  const tokens = new Set(['--text-1', '--font-weight-semibold']);
  const css = ['.a { color: var(--text-1); }', '.b { font-weight: var(--weight-semibold); }'].join('\n');
  assert.deepEqual(findUndefinedProperties(css, tokens), [
    { line: 2, kind: 'undefined property', text: '--weight-semibold' },
  ]);
});

test('a fallback does not excuse an undefined name', () => {
  assert.deepEqual(
    findUndefinedProperties('.a { font-size: var(--text-sm, 14px); }', new Set()).map((violation) => violation.text),
    ['--text-sm']
  );
});

test('allows Mantine variables and properties the same file defines', () => {
  const css = [
    '.a { --tier-color: var(--accent); }',
    '.b { color: var(--tier-color); outline-color: var(--mantine-color-ink-8); }',
  ].join('\n');
  assert.deepEqual(findUndefinedProperties(css, new Set(['--accent'])), []);
});

test('allows the listed Mantine component properties', () => {
  for (const name of MANTINE_COMPONENT_PROPERTIES) {
    assert.deepEqual(findUndefinedProperties(`.a { width: var(${name}); }`, new Set()), [], name);
  }
});

test('leaves legacy names to the legacy-token rule, and keeps line numbers past comments', () => {
  const css = '/* var(--nope)\n */\n.a { color: var(--color-primary); background: var(--nope); }';
  assert.deepEqual(findUndefinedProperties(css, new Set()), [{ line: 3, kind: 'undefined property', text: '--nope' }]);
});

test('checkFiles reports undefined properties when given the token names', () => {
  const errors = checkFiles(
    [{ path: 'apps/web/src/e.module.css', content: '.e { color: var(--text-9); }' }],
    new Set(['--text-1'])
  );
  assert.deepEqual(errors, ['apps/web/src/e.module.css:1 undefined property: --text-9']);
});
