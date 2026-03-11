import { validateMediaUrl } from './mediaUrl';

describe('mediaUrl security validation', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks data scheme URLs', () => {
    const result = validateMediaUrl('data:text/plain;base64,SGVsbG8=');

    expect(result.allowed).toBe(false);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Unsafe URL scheme');
  });

  it('blocks javascript scheme URLs', () => {
    const result = validateMediaUrl('javascript:alert(1)');

    expect(result.allowed).toBe(false);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Unsafe URL scheme');
  });

  it('blocks RFC-1918 private IP hosts', () => {
    const result = validateMediaUrl('http://192.168.1.10/photo.jpg');

    expect(result.allowed).toBe(false);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Private/local host');
  });

  it('blocks localhost hostnames', () => {
    const result = validateMediaUrl('http://localhost/image.png');

    expect(result.allowed).toBe(false);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Private/local host');
  });

  it('blocks IPv6 loopback hosts', () => {
    const result = validateMediaUrl('http://[::1]/asset.png');

    expect(result.allowed).toBe(false);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Private/local host');
  });

  it('blocks .local hosts', () => {
    const result = validateMediaUrl('http://nas.local/media.jpg');

    expect(result.allowed).toBe(false);
    expect(result.safe).toBe(false);
    expect(result.reason).toContain('Private/local host');
  });

  it('returns warning state for non-standard ports', () => {
    const result = validateMediaUrl('https://cdn.example.com:8443/file.jpg');

    expect(result.allowed).toBe(true);
    expect(result.safe).toBe(false);
    expect(result.reason).toBe('Non-standard port: 8443');
  });

  it('allows standard HTTPS URLs as safe', () => {
    const result = validateMediaUrl('https://cdn.example.com/images/file.jpg');

    expect(result).toEqual({ allowed: true, safe: true });
  });
});
