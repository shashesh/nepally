import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, buildSecurityHeaders } from './securityHeaders.cjs';

const SUPABASE_URL = 'https://abc123.supabase.co';

/** Parse a CSP string into directive → sources. */
function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split('; ').map((directive) => {
      const [name, ...sources] = directive.split(' ');
      return [name, sources];
    })
  );
}

function headerValue(key: string, options = { supabaseUrl: SUPABASE_URL }): string | undefined {
  return buildSecurityHeaders(options).find((header) => header.key === key)?.value;
}

describe('buildContentSecurityPolicy', () => {
  it('lets the app reach its Supabase project over https and realtime over wss', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: SUPABASE_URL }));

    expect(csp.get('connect-src')).toEqual(
      expect.arrayContaining(["'self'", 'https://abc123.supabase.co', 'wss://abc123.supabase.co'])
    );
  });

  it('drops the path and trailing slash from the Supabase URL', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: 'https://abc123.supabase.co/' }));

    expect(csp.get('connect-src')).toContain('https://abc123.supabase.co');
  });

  it('uses ws for a local http Supabase', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: 'http://127.0.0.1:54321' }));

    expect(csp.get('connect-src')).toEqual(
      expect.arrayContaining(['http://127.0.0.1:54321', 'ws://127.0.0.1:54321'])
    );
  });

  it('allows the reverse-geocoding API that "use my location" calls', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: SUPABASE_URL }));

    expect(csp.get('connect-src')).toContain('https://nominatim.openstreetmap.org');
  });

  it('leaves Supabase out rather than throwing when the URL is missing or malformed', () => {
    for (const supabaseUrl of [undefined, '', 'not a url']) {
      const csp = directives(buildContentSecurityPolicy({ supabaseUrl }));
      expect(csp.get('connect-src')).toEqual(["'self'", 'https://nominatim.openstreetmap.org']);
    }
  });

  it('runs only our own scripts in production, with no inline or eval', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: SUPABASE_URL }));

    expect(csp.get('script-src')).toEqual(["'self'"]);
  });

  it('allows eval in development, where Next.js and React need it', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: SUPABASE_URL, isDev: true }));

    expect(csp.get('script-src')).toEqual(["'self'", "'unsafe-eval'"]);
  });

  it('refuses to be framed and blocks plugins, base-tag hijacks and foreign form posts', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: SUPABASE_URL }));

    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(csp.get('form-action')).toEqual(["'self'"]);
  });

  it('allows photo previews from blob: URLs and photos from https hosts', () => {
    const csp = directives(buildContentSecurityPolicy({ supabaseUrl: SUPABASE_URL }));

    expect(csp.get('img-src')).toEqual(expect.arrayContaining(['blob:', 'https:']));
  });
});

describe('buildSecurityHeaders', () => {
  it('sends the CSP it builds', () => {
    expect(headerValue('Content-Security-Policy')).toBe(
      buildContentSecurityPolicy({ supabaseUrl: SUPABASE_URL })
    );
  });

  it('pins HTTPS for two years, subdomains included', () => {
    expect(headerValue('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
  });

  it('sets the standard hardening headers', () => {
    expect(headerValue('X-Content-Type-Options')).toBe('nosniff');
    expect(headerValue('X-Frame-Options')).toBe('DENY');
    expect(headerValue('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(headerValue('Cross-Origin-Opener-Policy')).toBe('same-origin');
  });

  it('keeps geolocation for our own pages and turns camera and microphone off', () => {
    const policy = headerValue('Permissions-Policy');

    expect(policy).toContain('geolocation=(self)');
    expect(policy).toContain('camera=()');
    expect(policy).toContain('microphone=()');
  });
});
