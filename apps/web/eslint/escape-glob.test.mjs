import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeGlobLiteral } from './escape-glob.mjs';

test('escapes a Next.js dynamic route segment', () => {
  assert.equal(escapeGlobLiteral('src/pages/users/[id].page.tsx'), 'src/pages/users/\\[id\\].page.tsx');
});

test('returns a path without brackets unchanged', () => {
  assert.equal(escapeGlobLiteral('src/pages/login.page.tsx'), 'src/pages/login.page.tsx');
});

test('escapes multiple bracket pairs, including catch-all routes', () => {
  assert.equal(
    escapeGlobLiteral('src/pages/[a]/[[...slug]].page.tsx'),
    'src/pages/\\[a\\]/\\[\\[...slug\\]\\].page.tsx'
  );
});
