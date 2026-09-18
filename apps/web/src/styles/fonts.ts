import localFont from 'next/font/local';

/**
 * Self-hosted brand faces (Fontshare, ITF Free Font License). next/font inlines
 * the @font-face rules, preloads the files and sizes a metric-matched fallback,
 * so there is no third-party request and no layout shift.
 */
export const displayFont = localFont({
  src: [{ path: './fonts/Gambarino-Regular.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
  fallback: ['Source Serif Pro', 'Georgia', 'serif'],
});

export const bodyFont = localFont({
  src: [
    { path: './fonts/Switzer-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Switzer-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Switzer-Semibold.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  fallback: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
});
