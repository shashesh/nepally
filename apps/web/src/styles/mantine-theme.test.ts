import { describe, expect, it } from 'vitest';
import { converter } from 'culori';
import { DEFAULT_THEME, defaultVariantColorsResolver, mergeMantineTheme } from '@mantine/core';
import { cssVariablesResolver, nepallyTheme, variantColorResolver } from './mantine-theme';
import { readTokenMap, resolveToken } from './tokens.testutil';

const tokens = readTokenMap();
const theme = mergeMantineTheme(DEFAULT_THEME, nepallyTheme);
const toRgb = converter('rgb');
const token = (name: string) => resolveToken(tokens, name);

function byteChannels(color: string): number[] {
  const rgb = toRgb(color);
  if (!rgb) throw new Error(`Unparseable colour ${color}`);
  return [rgb.r, rgb.g, rgb.b].map((channel) => Math.round(Math.min(1, Math.max(0, channel)) * 255));
}

function expectSameColour(actual: string, tokenName: string): void {
  const a = byteChannels(actual);
  const e = byteChannels(token(tokenName));
  const close = a.every((channel, index) => Math.abs(channel - e[index]) <= 2);
  expect(close, `${actual} should match ${tokenName} ≈ rgb(${e.join(', ')})`).toBe(true);
}

describe('nepallyTheme mirrors tokens.css', () => {
  it('ink shades 7, 8, 9 match --ink-700, --ink-800, --ink-900', () => {
    expectSameColour(theme.colors.ink[7], '--ink-700');
    expectSameColour(theme.colors.ink[8], '--ink-800');
    expectSameColour(theme.colors.ink[9], '--ink-900');
  });

  it('marigold shades 1, 5, 7 match --marigold-100, --marigold-500, --marigold-700', () => {
    expectSameColour(theme.colors.marigold[1], '--marigold-100');
    expectSameColour(theme.colors.marigold[5], '--marigold-500');
    expectSameColour(theme.colors.marigold[7], '--marigold-700');
  });

  it('uses ink shade 8 (--action-bg) as the primary colour', () => {
    expect(theme.primaryColor).toBe('ink');
    expect(theme.primaryShade).toBe(8);
  });

  it('font sizes mirror --font-size-*', () => {
    expect(theme.fontSizes).toMatchObject({
      xs: token('--font-size-xs'),
      sm: token('--font-size-sm'),
      md: token('--font-size-base'),
      lg: token('--font-size-lg'),
      xl: token('--font-size-xl'),
    });
  });

  it('spacing mirrors the 4pt scale', () => {
    expect(theme.spacing).toMatchObject({
      xs: token('--space-2'),
      sm: token('--space-3'),
      md: token('--space-4'),
      lg: token('--space-5'),
      xl: token('--space-6'),
    });
  });

  it('radius mirrors the purpose-named radii', () => {
    expect(theme.radius).toMatchObject({
      xs: token('--radius-chip'),
      sm: token('--radius-tag'),
      md: token('--radius-control'),
      lg: token('--radius-card'),
      xl: token('--radius-overlay'),
    });
  });

  it('sets defaultRadius explicitly (Mantine 9 changes the default)', () => {
    expect(theme.defaultRadius).toBe('md');
  });

  it('breakpoints match the CSS breakpoints', () => {
    expect(theme.breakpoints).toMatchObject({ sm: '48em', md: '62em', lg: '75em' });
  });

  it('uses the global focus ring class', () => {
    expect(theme.focusClassName).toBe('nepally-focus');
  });

  it('adds the marigold underline only to primary filled buttons', () => {
    const buttonClassNames = nepallyTheme.components?.Button?.classNames as (
      t: unknown,
      props: { variant?: string; color?: string }
    ) => Record<string, string>;
    expect(Object.keys(buttonClassNames(theme, {}))).toEqual(['root']);
    expect(buttonClassNames(theme, { variant: 'outline' })).toEqual({});
    expect(buttonClassNames(theme, { color: 'red' })).toEqual({});
  });
});

describe('variantColorResolver', () => {
  it('renders light variants as solid tints with dark text (stable across Mantine 8 → 9)', () => {
    expect(variantColorResolver({ color: 'ink', theme, variant: 'light' })).toEqual({
      background: theme.colors.ink[1],
      hover: theme.colors.ink[2],
      color: theme.colors.ink[9],
      border: 'transparent',
    });
  });

  it('treats Mantine default palettes the same way', () => {
    expect(variantColorResolver({ color: 'red', theme, variant: 'light' })).toEqual({
      background: theme.colors.red[1],
      hover: theme.colors.red[2],
      color: theme.colors.red[9],
      border: 'transparent',
    });
  });

  it('defers to Mantine for every other variant', () => {
    const input = { color: 'ink', theme, variant: 'filled' };
    expect(variantColorResolver(input)).toEqual(defaultVariantColorsResolver(input));
  });
});

describe('cssVariablesResolver', () => {
  it('points Mantine surface, text and border variables at semantic tokens', () => {
    expect(cssVariablesResolver(theme).light).toMatchObject({
      '--mantine-color-body': 'var(--surface-0)',
      '--mantine-color-text': 'var(--text-1)',
      '--mantine-color-dimmed': 'var(--text-2)',
      '--mantine-color-placeholder': 'var(--text-3)',
      '--mantine-color-default': 'var(--surface-1)',
      '--mantine-color-default-hover': 'var(--surface-2)',
      '--mantine-color-default-color': 'var(--text-1)',
      '--mantine-color-default-border': 'var(--border-solid)',
      '--mantine-color-anchor': 'var(--action-bg)',
      '--mantine-color-error': 'var(--danger)',
    });
  });
});
