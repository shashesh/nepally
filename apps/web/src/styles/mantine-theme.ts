import {
  createTheme,
  defaultVariantColorsResolver,
  parseThemeColor,
  type CSSVariablesResolver,
  type MantineColorsTuple,
  type VariantColorsResolver,
} from '@mantine/core';
import classes from './mantine-components.module.css';

/**
 * Mantine theme for the H1 "Ink & Marigold" design system.
 *
 * tokens.css is the source of truth. Mantine needs literal colours to derive
 * variants, so the tuples repeat token values and mantine-theme.test.ts fails
 * if they drift. Component overrides are plain objects (not Component.extend)
 * so tests that mock individual Mantine components can still load the theme.
 */

/** Shade 7 = --ink-700 (hover), 8 = --ink-800 (--action-bg), 9 = --ink-900 (--text-1). */
export const ink: MantineColorsTuple = [
  '#EEF1F7',
  '#DCE2EE',
  '#B8C3DA',
  '#91A1C3',
  '#6C7FA9',
  '#4F6290',
  '#384A77',
  '#1E305B',
  '#132246',
  '#0F141D',
];

/** Shade 1 = --marigold-100 (tint), 5 = --marigold-500 (accent), 7 = --marigold-700 (accent ink). */
export const marigold: MantineColorsTuple = [
  '#FEF7EA',
  '#FBE9C6',
  '#F8D597',
  '#F4C06A',
  '#F0AE4A',
  '#ED9E2F',
  '#A96A12',
  '#6E4108',
  '#55320A',
  '#3B2307',
];

/**
 * `light` variants as solid tint + dark text. Mantine 9 switches light variants
 * from translucent to solid on its own terms; defining them here keeps visuals
 * identical across the upgrade.
 */
export const variantColorResolver: VariantColorsResolver = (input) => {
  const defaults = defaultVariantColorsResolver(input);
  if (input.variant !== 'light') return defaults;

  const parsed = parseThemeColor({ color: input.color ?? input.theme.primaryColor, theme: input.theme });
  if (!parsed.isThemeColor) return defaults;

  const shades = input.theme.colors[parsed.color];
  return { background: shades[1], hover: shades[2], color: shades[9], border: 'transparent' };
};

/** Sits Mantine components on the token surfaces instead of Mantine's own greys. */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
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
    '--mantine-color-disabled': 'var(--surface-2)',
    '--mantine-color-disabled-color': 'var(--text-3)',
    '--mantine-color-disabled-border': 'var(--border-subtle)',
  },
  dark: {},
});

export const nepallyTheme = createTheme({
  colors: { ink, marigold },
  primaryColor: 'ink',
  primaryShade: 8,
  white: '#FFFFFF',
  black: '#0F141D',
  variantColorResolver,

  fontFamily: 'var(--font-body)',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: {
    fontFamily: 'var(--font-display)',
    fontWeight: '400',
    sizes: {
      h1: { fontSize: 'var(--font-size-display)', lineHeight: '1.15' },
      h2: { fontSize: 'var(--font-size-xl)', lineHeight: '1.15' },
      h3: { fontSize: 'var(--font-size-lg)', lineHeight: '1.35' },
      h4: { fontSize: 'var(--font-size-base)', lineHeight: '1.35' },
    },
  },
  fontSizes: {
    xs: '0.8125rem',
    sm: '0.9375rem',
    md: '1.0625rem',
    lg: '1.1875rem',
    xl: '1.5rem',
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  defaultRadius: 'md',
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },
  shadows: {
    xs: 'none',
    sm: '0 0 0 1px var(--border-subtle)',
    md: 'var(--shadow-float)',
    lg: 'var(--shadow-float)',
    xl: 'var(--shadow-modal)',
  },
  cursorType: 'pointer',
  focusClassName: 'nepally-focus',

  components: {
    Button: {
      classNames: (_theme: unknown, props: { variant?: string; color?: string }) =>
        (props.variant ?? 'filled') === 'filled' && (props.color ?? 'ink') === 'ink'
          ? { root: classes.primaryButton }
          : {},
    },
    Badge: { classNames: { root: classes.badge } },
    Tabs: { vars: () => ({ root: { '--tabs-color': 'var(--accent)' } }) },
    Menu: { defaultProps: { shadow: 'md', radius: 'lg' }, classNames: { dropdown: classes.floating } },
    Popover: { defaultProps: { shadow: 'md', radius: 'lg' }, classNames: { dropdown: classes.floating } },
    Combobox: { classNames: { dropdown: classes.floating } },
    Modal: {
      defaultProps: { radius: 'xl', closeButtonProps: { 'aria-label': 'Close' } },
      classNames: { content: classes.modal },
    },
    Input: { classNames: { input: classes.input } },
    Notification: { defaultProps: { radius: 'lg' } },
  },
});
