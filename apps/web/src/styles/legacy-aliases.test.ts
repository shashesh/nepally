import { readFileSync } from 'node:fs';
// Node's URL: under Vitest's jsdom environment the global URL is jsdom's, which mis-parses file:///C:/ on Windows.
import { URL as NodeURL, fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { converter } from 'culori';
import { readTokenMap, resolveToken } from './tokens.testutil';

const tokens = readTokenMap();
const legacyPath = fileURLToPath(new NodeURL('./legacy-aliases.css', import.meta.url));
const legacy = readTokenMap(readFileSync(legacyPath, 'utf8'));
const defined = new Map([...tokens, ...legacy]);
const toRgb = converter('rgb');

/** Every custom property the retired design-system.css defined. */
const LEGACY_NAMES = [
  '--color-primary', '--color-primary-dark', '--color-primary-light', '--color-primary-rgb',
  '--color-secondary', '--color-secondary-dark', '--color-secondary-light', '--color-secondary-rgb',
  '--color-accent-red', '--color-success', '--color-warning', '--color-error',
  '--gradient-primary', '--gradient-primary-hover', '--gradient-secondary', '--gradient-bg',
  '--color-bg', '--color-surface', '--color-surface-low', '--color-surface-container',
  '--color-text-primary', '--color-text-secondary', '--color-text-tertiary',
  '--color-border', '--color-border-solid', '--color-disabled',
  '--color-trust-new', '--color-trust-verified', '--color-trust-contributor',
  '--color-banner-bg', '--color-banner-text',
  '--glass-bg', '--glass-bg-strong', '--glass-bg-card', '--glass-blur', '--glass-blur-sm',
  '--glass-border', '--glass-border-card', '--ghost-border',
  '--font-family', '--font-display',
  '--font-size-h1', '--font-size-h2', '--font-size-h3', '--font-size-body', '--font-size-small', '--font-size-caption',
  '--font-weight-regular', '--font-weight-medium', '--font-weight-semibold', '--font-weight-bold', '--font-weight-extrabold',
  '--line-height-tight', '--line-height-normal', '--line-height-relaxed',
  '--space-xxs', '--space-xs', '--space-s', '--space-m', '--space-l', '--space-xl', '--space-xxl',
  '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl', '--radius-full',
  '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-glass',
  '--max-width', '--content-width', '--sidebar-width', '--nav-height', '--input-height', '--button-height', '--card-padding',
  '--surface-rail-bg', '--surface-rail-blur', '--surface-rail-border', '--surface-rail-shadow',
  '--surface-topbar-bg', '--surface-topbar-blur', '--surface-topbar-border', '--surface-topbar-shadow',
  '--surface-nav-bg', '--surface-nav-blur', '--surface-nav-border', '--surface-nav-shadow',
  '--dropdown-bg', '--dropdown-border', '--dropdown-shadow',
  '--transition-fast', '--transition-normal', '--transition-spring',
];

function toByteChannels(color: string): number[] {
  const rgb = toRgb(color);
  if (!rgb) throw new Error(`Unparseable colour ${color}`);
  return [rgb.r, rgb.g, rgb.b].map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255));
}

describe('legacy-aliases.css', () => {
  it.each(LEGACY_NAMES)('%s is still defined', (name) => {
    expect(defined.has(name)).toBe(true);
  });

  it('only references variables that exist', () => {
    for (const [name, value] of legacy) {
      for (const reference of value.matchAll(/var\((--[\w-]+)\)/g)) {
        expect(defined.has(reference[1]), `${name} references undefined ${reference[1]}`).toBe(true);
      }
    }
  });

  it('never redefines a name that tokens.css owns', () => {
    for (const name of legacy.keys()) {
      expect(tokens.has(name), `${name} is defined in both files`).toBe(false);
    }
  });

  it.each([
    ['--color-primary-rgb', '--action-bg'],
    ['--color-secondary-rgb', '--accent'],
  ])('%s is the sRGB triplet of %s', (legacyName, tokenName) => {
    const triplet = legacy.get(legacyName)!.split(',').map((part) => Number(part.trim()));
    const expected = toByteChannels(resolveToken(tokens, tokenName));
    const close = triplet.every((channel, index) => Math.abs(channel - expected[index]) <= 2);
    expect(close, `expected ≈ ${expected.join(', ')}, got ${triplet.join(', ')}`).toBe(true);
  });
});
