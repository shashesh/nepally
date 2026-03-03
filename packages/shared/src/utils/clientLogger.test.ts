import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { logClientEvent } from './clientLogger';

describe('logClientEvent', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

  beforeEach(() => {
    errorSpy.mockClear();
    warnSpy.mockClear();
    infoSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('logs errors by default', () => {
    logClientEvent({
      event: 'comment_delete_failed',
      context: { commentId: 'c1' },
      error: new Error('Forbidden'),
    });

    expect(errorSpy).toHaveBeenCalledWith('comment_delete_failed', {
      event: 'comment_delete_failed',
      context: { commentId: 'c1' },
      error: 'Forbidden',
    });
  });

  it('logs warn and info levels to matching console channels', () => {
    logClientEvent({ event: 'warn_event', level: 'warn', error: 'warn-text' });
    logClientEvent({ event: 'info_event', level: 'info' });

    expect(warnSpy).toHaveBeenCalledWith('warn_event', {
      event: 'warn_event',
      context: {},
      error: 'warn-text',
    });
    expect(infoSpy).toHaveBeenCalledWith('info_event', {
      event: 'info_event',
      context: {},
      error: undefined,
    });
  });
});
