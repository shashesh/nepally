# Web Security Headers

**Last updated:** 2026-09-25
**Applies to:** `apps/web` only.

Every response from the web app carries a fixed set of security headers. They are built in `apps/web/src/lib/securityHeaders.cjs` and applied to every path by `headers()` in `apps/web/next.config.js`. The unit tests are in `securityHeaders.test.ts`, next to the module.

## Headers

| Header                       | Value                                                        | Why                                                                                   |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `Content-Security-Policy`    | See [the policy](#content-security-policy)                   | Limits where scripts, connections and images can come from                            |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains`                        | HTTPS only for two years. Not submitted to the preload list; that is hard to undo     |
| `X-Content-Type-Options`     | `nosniff`                                                    | Browsers must not guess a file's type                                                 |
| `X-Frame-Options`            | `DENY`                                                       | Legacy twin of `frame-ancestors 'none'`: nobody can frame the site (clickjacking)     |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                            | Other sites see only our origin, never the path (post, profile or conversation ids)   |
| `Permissions-Policy`         | camera, microphone, payment, USB and Topics off; geolocation | Geolocation stays on for our own pages because "use my location" needs it             |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                | Sign-in and Stripe checkout are full-page redirects, so no popup needs a handle to us |

## Content Security Policy

| Directive                                    | Sources                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `default-src`                                | `'self'`                                                                                               |
| `script-src`                                 | `'self'`, plus `'unsafe-eval'` in `next dev` only                                                      |
| `style-src`                                  | `'self' 'unsafe-inline'`: Mantine writes style attributes and `<style>` tags at runtime                |
| `img-src`                                    | `'self' data: blob: https:`: Storage photos, `blob:` previews before upload                            |
| `font-src`                                   | `'self'`: fonts are self-hosted                                                                        |
| `connect-src`                                | `'self'`, the Supabase origin over `https` and `wss` (realtime), `https://nominatim.openstreetmap.org` |
| `worker-src`, `manifest-src`                 | `'self'`                                                                                               |
| `frame-src`, `frame-ancestors`, `object-src` | `'none'`                                                                                               |
| `base-uri`, `form-action`                    | `'self'`                                                                                               |

The Supabase origin comes from `NEXT_PUBLIC_SUPABASE_URL` at build time, so each environment allows only its own project. If the variable is missing or malformed, Supabase is left out and every Supabase call fails loudly. The build still succeeds.

**No inline scripts.** The Pages Router emits only external chunks plus the `__NEXT_DATA__` JSON block, and a `type="application/json"` script is not executed, so CSP does not block it. That is why `script-src` needs neither `'unsafe-inline'` nor a nonce. Adding an inline `<script>` (for example Mantine's `ColorSchemeScript`, or `next/script` with inline code) breaks in production. Either move it into a file under `public/` or switch to a nonce-based policy.

**Vercel preview deployments** inject the Vercel toolbar from `vercel.live`, which this policy blocks. The toolbar is missing on previews; the app itself works.

## Adding a third-party service

The browser blocks any origin the policy doesn't list, and the only sign is a console error. Before you ship a new script, API or embed, add its origins in `securityHeaders.cjs` and a test for them:

- **Sentry:** its ingest origin in `connect-src` (or a tunnel route on our own origin, which needs nothing).
- **PostHog:** its API and assets origins in `connect-src` and `script-src`.
- **Vercel Speed Insights / Analytics:** served from our own origin through `/_vercel/*`, so nothing extra is needed.

Then run `npm run build && npm run start` in `apps/web` and check the console on the pages that use the service. `next dev` allows `eval`, so it can hide a violation that production would hit.

## Checking the live headers

```bash
curl -sI https://nepally.us/ | grep -iE "content-security|strict-transport|x-frame|permissions|referrer|x-content|cross-origin"
```
