import { describe, expect, it } from 'vitest';
import { wcagContrast } from 'culori';
import { readTokenMap, resolveToken } from './tokens.testutil';

const tokens = readTokenMap();

/** WCAG 2.x AA for normal-size text. */
const AA_TEXT = 4.5;

const TEXT_PAIRS: Array<[foreground: string, background: string]> = [
  ['--text-1', '--surface-0'],
  ['--text-1', '--surface-1'],
  ['--text-1', '--surface-2'],
  ['--text-2', '--surface-0'],
  ['--text-2', '--surface-1'],
  ['--text-2', '--surface-2'],
  ['--text-3', '--surface-0'],
  ['--text-3', '--surface-1'],
  // surface-sunken was untested until the feed composer used it. Note the gap:
  // --text-3 on --surface-sunken is 4.25:1, under AA, so it is not a usable pair.
  ['--text-1', '--surface-sunken'],
  ['--text-2', '--surface-sunken'],
  ['--action-fg', '--action-bg'],
  ['--action-fg', '--action-bg-hover'],
  ['--accent-ink', '--accent-tint'],
  ['--trust-new-fg', '--trust-new-bg'],
  ['--trust-verified-fg', '--trust-verified-bg'],
  ['--trust-contributor-fg', '--trust-contributor-bg'],
  ['--emergency-fg', '--emergency-bg'],
  ['--danger', '--surface-1'],
  ['--success', '--surface-1'],
  ['--warning', '--surface-1'],
];

for (let tone = 1; tone <= 8; tone++) {
  TEXT_PAIRS.push([`--avatar-tone-${tone}-fg`, `--avatar-tone-${tone}-bg`]);
}

for (const type of ['cultural', 'religious', 'social', 'career', 'other']) {
  TEXT_PAIRS.push([`--event-${type}-fg`, `--event-${type}-bg`]);
}

describe('design token contrast (WCAG AA)', () => {
  it.each(TEXT_PAIRS)('%s on %s is at least 4.5:1', (foreground, background) => {
    const ratio = wcagContrast(resolveToken(tokens, foreground), resolveToken(tokens, background));
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
