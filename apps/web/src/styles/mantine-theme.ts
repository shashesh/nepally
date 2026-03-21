import { createTheme, MantineColorsTuple } from '@mantine/core';

/**
 * NUSA Mantine Theme
 *
 * Maps existing design-system.css tokens into Mantine's theme system.
 * The CSS custom properties in design-system.css remain the source of truth
 * for custom/layout styles. This theme ensures Mantine components
 * visually match the NUSA design language.
 */

// Primary palette: shades built from --color-primary (#0E5F9C)
const nusaPrimary: MantineColorsTuple = [
  '#e8f4ff', // 0 - lightest
  '#d1e6f7', // 1
  '#a3cce8', // 2
  '#72b0d9', // 3
  '#4a98cc', // 4
  '#3088c4', // 5
  '#0E5F9C', // 6 - base (matches --color-primary)
  '#0A4674', // 7 - dark (matches --color-primary-dark)
  '#073556', // 8
  '#03243a', // 9 - darkest
];

// Secondary/orange palette: shades built from --color-secondary (#F7941D)
const nusaSecondary: MantineColorsTuple = [
  '#FFF8EE', // 0
  '#FDE7C7', // 1 (matches --color-secondary-light)
  '#FBD49E', // 2
  '#F9BF73', // 3
  '#F8AB49', // 4
  '#F7941D', // 5 - base (matches --color-secondary)
  '#D97D0B', // 6 (matches --color-secondary-dark)
  '#B26508', // 7
  '#8A4E06', // 8
  '#633803', // 9
];

// Red/error palette: built from --color-accent-red (#DC143C) and --color-error (#C62828)
const nusaRed: MantineColorsTuple = [
  '#FFF1F3',
  '#FFD6DC',
  '#FFA8B5',
  '#F4748A',
  '#E84463',
  '#DC143C', // 5 - accent red
  '#C62828', // 6 - error
  '#A01F1F',
  '#7A1717',
  '#540F0F',
];

export const nusaTheme = createTheme({
  // Typography — matches --font-family
  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headings: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '2.25rem', lineHeight: '1.2' },    // --font-size-h1
      h2: { fontSize: '1.5rem', lineHeight: '1.2' },     // --font-size-h2
      h3: { fontSize: '1.25rem', lineHeight: '1.2' },    // --font-size-h3
    },
  },
  fontSizes: {
    xs: '0.75rem',   // 12px — --font-size-caption
    sm: '0.875rem',  // 14px — --font-size-small
    md: '1rem',      // 16px — --font-size-body
    lg: '1.25rem',   // 20px — --font-size-h3
    xl: '1.5rem',    // 24px — --font-size-h2
  },

  // Spacing — matches 8pt grid
  spacing: {
    xxs: '4px',   // --space-xxs (custom key)
    xs: '8px',    // --space-xs
    sm: '16px',   // --space-s
    md: '24px',   // --space-m
    lg: '32px',   // --space-l
    xl: '48px',   // --space-xl
  },

  // Border radius — matches design system
  radius: {
    xs: '4px',
    sm: '8px',     // --radius-sm
    md: '14px',    // --radius-md
    lg: '20px',    // --radius-lg
    xl: '28px',    // --radius-xl
  },
  defaultRadius: 'md',

  // Shadows — matches design system
  shadows: {
    xs: '0 1px 4px rgba(14, 95, 156, 0.04)',
    sm: '0 2px 8px rgba(14, 95, 156, 0.06), 0 1px 2px rgba(14, 95, 156, 0.04)',   // --shadow-sm
    md: '0 4px 20px rgba(14, 95, 156, 0.10), 0 2px 6px rgba(14, 95, 156, 0.06)',   // --shadow-md
    lg: '0 8px 40px rgba(14, 95, 156, 0.14), 0 4px 16px rgba(14, 95, 156, 0.08)',  // --shadow-lg
    xl: '0 8px 32px rgba(14, 95, 156, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6)', // --shadow-glass
  },

  // Colors
  colors: {
    nusaPrimary,
    nusaSecondary,
    nusaRed,
  },
  primaryColor: 'nusaPrimary',
  primaryShade: 6,

  // White/black
  white: '#FFFFFF',
  black: '#1A2332', // --color-text-primary

  // Components — override defaults to match NUSA design
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Notification: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
