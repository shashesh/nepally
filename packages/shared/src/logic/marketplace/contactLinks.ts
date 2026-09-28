/**
 * URLs for a listing's contact details, so the apps can make each one a link.
 * Every builder returns null when the value can't make a safe link, and the
 * app then shows the value as plain text.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const WEB_SCHEME = /^https?:\/\//i;

/** `tel:` URL with the number's digits and a leading `+`, e.g. "(555) 010-0199" → "tel:5550100199". */
export function toTelUrl(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  return `tel:${trimmed.startsWith('+') ? '+' : ''}${digits}`;
}

export function toMailtoUrl(email: string): string | null {
  const trimmed = email.trim();
  return EMAIL.test(trimmed) ? `mailto:${trimmed}` : null;
}

/** The website as an http(s) URL, adding https when no scheme was typed. Other schemes aren't links. */
export function toWebsiteUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (WEB_SCHEME.test(trimmed)) return trimmed;
  if (HAS_SCHEME.test(trimmed)) return null;
  return `https://${trimmed}`;
}

export interface MapsUrls {
  /** Apple Maps, for iOS. */
  apple: string;
  /** Whatever maps app Android has. */
  geo: string;
  /** Google Maps in a browser, when neither opens. */
  google: string;
}

export function toMapsUrls(address: string): MapsUrls | null {
  const trimmed = address.trim();
  if (!trimmed) return null;
  const query = encodeURIComponent(trimmed);
  return {
    apple: `maps:?q=${query}`,
    geo: `geo:0,0?q=${query}`,
    google: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}
