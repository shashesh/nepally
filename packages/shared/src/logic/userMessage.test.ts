import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toApiError } from '../utils/apiError';
import { CONNECTION_ERROR_MESSAGE } from './authErrors';

const mocks = vi.hoisted(() => ({ logClientEvent: vi.fn() }));

vi.mock('../utils/clientLogger', () => ({ logClientEvent: mocks.logClientEvent }));

import { userMessage } from './userMessage';

const RLS_TEXT = 'new row violates row-level security policy';
const FALLBACK = "Couldn't save your post. Please try again.";

describe('userMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs the raw error once with its event and context', () => {
    const error = new Error(RLS_TEXT);

    userMessage(error, FALLBACK, 'post_create_failed', { postId: 'p1' });

    expect(mocks.logClientEvent).toHaveBeenCalledTimes(1);
    expect(mocks.logClientEvent).toHaveBeenCalledWith({
      event: 'post_create_failed',
      error,
      context: { postId: 'p1' },
    });
  });

  it('gives the fallback for an Error whose message is RLS text, never the text', () => {
    const message = userMessage(new Error(RLS_TEXT), FALLBACK, 'post_create_failed');

    expect(message).toBe(FALLBACK);
    expect(message).not.toContain('row-level security');
  });

  it('gives the fallback for a PostgREST-shaped error', () => {
    expect(userMessage({ code: '42501', message: RLS_TEXT }, FALLBACK, 'x_failed')).toBe(FALLBACK);
  });

  it.each([null, undefined, 'Failed to fetch'])('gives the fallback for %p', (error) => {
    expect(userMessage(error, FALLBACK, 'x_failed')).toBe(FALLBACK);
  });

  it('gives the connection sentence for a network failure', () => {
    expect(userMessage({ name: 'AuthRetryableFetchError', status: 0 }, FALLBACK, 'x_failed')).toBe(
      CONNECTION_ERROR_MESSAGE
    );
    expect(userMessage({ status: 503 }, FALLBACK, 'x_failed')).toBe(CONNECTION_ERROR_MESSAGE);
  });

  it('gives the connection sentence for a shared-API fetch failure', () => {
    const error = toApiError(
      { message: 'TypeError: Failed to fetch', details: '', hint: '', code: '' },
      'Failed to fetch posts'
    );

    expect(userMessage(error, FALLBACK, 'feed_load_failed')).toBe(CONNECTION_ERROR_MESSAGE);
  });
});
