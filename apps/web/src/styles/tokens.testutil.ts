import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

// Use Node's own `URL` under an alias (not the bare global name). Under
// Vitest's jsdom test environment, an identifier literally named `URL`
// resolves to jsdom's implementation even when imported from `node:url` —
// and jsdom's `URL` mis-resolves a `file:///C:/...` Windows base URL against
// `http://localhost:3000/` instead of the given base, breaking
// `fileURLToPath` below. Aliasing avoids the collision on every platform.
const TOKENS_PATH = fileURLToPath(new NodeURL('./tokens.css', import.meta.url));

/** Parses the first `:root { … }` block of a stylesheet into name → raw value. */
export function readTokenMap(css: string = readFileSync(TOKENS_PATH, 'utf8')): Map<string, string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rootBlock = withoutComments.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootBlock) throw new Error('Stylesheet has no :root block');

  const tokens = new Map<string, string>();
  for (const declaration of rootBlock[1].split(';')) {
    const match = declaration.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (match) tokens.set(match[1], match[2].replace(/\s+/g, ' '));
  }
  return tokens;
}

/** Follows `var(--x)` references until a literal value is reached. */
export function resolveToken(tokens: Map<string, string>, name: string, seen: Set<string> = new Set()): string {
  const raw = tokens.get(name);
  if (raw === undefined) throw new Error(`Unknown token ${name}`);
  const reference = raw.match(/^var\((--[\w-]+)\)$/);
  if (!reference) return raw;
  if (seen.has(name)) throw new Error(`Circular token reference at ${name}`);
  seen.add(name);
  return resolveToken(tokens, reference[1], seen);
}
