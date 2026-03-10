const ALLOWED_SCHEMES = new Set(['https:', 'http:']);

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^0\.0\.0\.0$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^::1$/,
  /^\[::1\]$/,
  /\.local$/i,
];

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
}

export interface MediaUrlValidationResult {
  allowed: boolean;
  safe: boolean;
  reason?: string;
}

export function validateMediaUrl(url: string): MediaUrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, safe: false, reason: 'Invalid URL' };
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    console.warn(`[mediaUrl] Blocked URL with unsafe scheme: ${parsed.protocol}`);
    return { allowed: false, safe: false, reason: `Unsafe URL scheme: ${parsed.protocol}` };
  }

  if (isPrivateHost(parsed.hostname)) {
    console.warn(`[mediaUrl] Blocked URL with private/local host: ${parsed.hostname}`);
    return { allowed: false, safe: false, reason: `Private/local host: ${parsed.hostname}` };
  }

  const defaultPort = parsed.protocol === 'https:' ? '443' : '80';
  if (parsed.port && parsed.port !== defaultPort) {
    console.warn(`[mediaUrl] Non-standard port in media URL: ${parsed.port}`);
    return { allowed: true, safe: false, reason: `Non-standard port: ${parsed.port}` };
  }

  return { allowed: true, safe: true };
}

export function sanitizeMediaUri(uri: string | null | undefined): string | null {
  if (!uri) return null;

  const result = validateMediaUrl(uri);

  if (!result.allowed) {
    console.error(`[mediaUrl] Blocked media URI: ${result.reason}`);
    return null;
  }

  if (!result.safe) {
    console.warn(`[mediaUrl] Media URI allowed with warning: ${result.reason}`);
  }

  return uri;
}
