/**
 * Security headers for every web response, applied from next.config.js.
 *
 * CommonJS because next.config.js requires it at build time; it lives under
 * src/ so vitest picks up its test.
 *
 * Adding a third-party script, API or embed (Sentry, PostHog, Vercel Speed
 * Insights…) means adding its origin to the matching directive here, or the
 * browser blocks it. See docs/architecture/web-security-headers.md.
 */

/** Reverse geocoding for "use my location" (src/lib/location.ts). */
const NOMINATIM_ORIGIN = 'https://nominatim.openstreetmap.org';

/** Two years: the minimum the HSTS preload list accepts, should we ever submit. */
const HSTS_MAX_AGE_SECONDS = 63072000;

/**
 * The Supabase project's https origin and its realtime (wss) origin.
 * Empty when the URL is missing or malformed, so a bad env var yields a
 * stricter policy rather than a crash.
 *
 * @param {string | undefined} supabaseUrl
 * @returns {string[]}
 */
function supabaseOrigins(supabaseUrl) {
  if (!supabaseUrl) return [];
  try {
    const { protocol, host } = new URL(supabaseUrl);
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    return [`${protocol}//${host}`, `${wsProtocol}//${host}`];
  } catch {
    return [];
  }
}

/**
 * @param {{ supabaseUrl?: string, isDev?: boolean }} options
 * @returns {string}
 */
function buildContentSecurityPolicy({ supabaseUrl, isDev = false }) {
  // Next.js dev mode and React's dev build evaluate code at runtime.
  const scriptSrc = isDev ? ["'self'", "'unsafe-eval'"] : ["'self'"];

  const directives = [
    ['default-src', ["'self'"]],
    ['script-src', scriptSrc],
    // Mantine sets style attributes and injects <style> tags at runtime, and
    // FontVariables writes the font custom properties inline.
    ['style-src', ["'self'", "'unsafe-inline'"]],
    // Photos load straight from Supabase Storage public URLs, avatars and
    // seed content can come from other https hosts, and photo previews are
    // blob: URLs before upload.
    ['img-src', ["'self'", 'data:', 'blob:', 'https:']],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...supabaseOrigins(supabaseUrl), NOMINATIM_ORIGIN]],
    ['worker-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ['frame-src', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ];

  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}

/**
 * @param {{ supabaseUrl?: string, isDev?: boolean }} options
 * @returns {{ key: string, value: string }[]}
 */
function buildSecurityHeaders(options) {
  return [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(options) },
    { key: 'Strict-Transport-Security', value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains` },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Legacy twin of frame-ancestors 'none' for browsers without CSP Level 2.
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      // Geolocation stays on for our own pages: "use my location" needs it.
      value: 'camera=(), microphone=(), geolocation=(self), payment=(), usb=(), browsing-topics=()',
    },
    // Sign-in and checkout are full-page redirects, never popups, so nothing
    // needs a cross-origin window handle back to us.
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}

module.exports = { buildContentSecurityPolicy, buildSecurityHeaders };
