import { describe, expect, it } from 'vitest';
import { isConnectionError } from '../logic/authErrors';
import { ApiError, toApiError } from './apiError';

/** The object postgrest-js resolves with when fetch itself rejects (no response). */
function postgrestFetchFailure(message: string) {
  return { message, details: `${message}\n\nCaused by: Error: getaddrinfo ENOTFOUND`, hint: '', code: '' };
}

describe('toApiError', () => {
  it('returns an Error unchanged', () => {
    const original = new Error('Metro area not found');

    expect(toApiError(original, 'Failed to fetch metro area')).toBe(original);
  });

  it('gives a plain object the fallback message and copies its code', () => {
    const result = toApiError(
      { message: 'new row violates row-level security policy', code: '42501', details: null, hint: null },
      'Failed to create post'
    );

    expect(result).toBeInstanceOf(ApiError);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('Failed to create post');
    expect((result as ApiError).code).toBe('42501');
    expect((result as ApiError).status).toBeUndefined();
  });

  it('uses the fallback for a non-object', () => {
    const result = toApiError('boom', 'Failed to fetch posts');

    expect(result.message).toBe('Failed to fetch posts');
    expect((result as ApiError).code).toBeUndefined();
  });

  it.each([
    'TypeError: Failed to fetch',
    'TypeError: fetch failed',
    'TypeError: Network request failed',
    'TypeError: NetworkError when attempting to fetch resource.',
    'TypeError: Load failed',
    'AbortError: The operation was aborted.',
  ])('marks a PostgREST fetch failure (%s) as status 0', (message) => {
    const result = toApiError(postgrestFetchFailure(message), 'Failed to fetch posts');

    expect(result.message).toBe('Failed to fetch posts');
    expect((result as ApiError).status).toBe(0);
    expect(isConnectionError(result)).toBe(true);
  });

  it('does not mark a 4xx body as a connection failure', () => {
    const result = toApiError(
      { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: '', hint: null },
      'Failed to fetch post'
    );

    expect((result as ApiError).status).toBeUndefined();
    expect(isConnectionError(result)).toBe(false);
  });

  it('does not mark an empty-code error that names no network failure', () => {
    const result = toApiError({ message: 'Bad Request', code: '' }, 'Failed to fetch post');

    expect((result as ApiError).status).toBeUndefined();
    expect(isConnectionError(result)).toBe(false);
  });

  it('does not mark a body without a code even if it mentions fetch', () => {
    const result = toApiError({ message: 'TypeError: fetch failed' }, 'Failed to fetch post');

    expect(isConnectionError(result)).toBe(false);
  });
});
