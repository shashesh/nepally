const test = require('node:test');
const assert = require('node:assert/strict');
const { findViolations } = require('./guard-css-tokens');

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

test('ignores colours inside comments but keeps line numbers', () => {
  const css = '/* was\n #fff */\n.a { color: #000; }';
  assert.deepEqual(findViolations(css).map((violation) => violation.line), [3]);
});
