import React from 'react';
import { act, fireEvent, render, screen } from '../../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ notifyError: vi.fn() }));
vi.mock('../ui/notify', () => ({ notify: { error: mocks.notifyError, success: vi.fn() } }));

import { MessageComposer } from './MessageComposer';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function renderComposer(onSend: (text: string) => Promise<boolean>) {
  render(<MessageComposer partnerName="Bikal S." onSend={onSend} />);
  return {
    field: screen.getByRole('textbox', { name: 'Message Bikal S.' }) as HTMLInputElement,
    send: screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement,
  };
}

describe('MessageComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps Send disabled while the field is blank or only spaces', () => {
    const { field, send } = renderComposer(vi.fn());
    expect(send.disabled).toBe(true);

    fireEvent.change(field, { target: { value: '   ' } });
    expect(send.disabled).toBe(true);

    fireEvent.change(field, { target: { value: 'Namaste' } });
    expect(send.disabled).toBe(false);
  });

  it('sends on Enter, then clears the field and keeps focus in it', async () => {
    const onSend = vi.fn().mockResolvedValue(true);
    const { field } = renderComposer(onSend);
    fireEvent.change(field, { target: { value: 'Namaste' } });

    await act(async () => {
      fireEvent.submit(field.form!);
    });

    expect(onSend).toHaveBeenCalledWith('Namaste');
    expect(field.value).toBe('');
    expect(document.activeElement).toBe(field);
  });

  it('keeps Send focusable and ignores another press while sending', async () => {
    const pending = deferred<boolean>();
    const onSend = vi.fn(() => pending.promise);
    const { field, send } = renderComposer(onSend);
    fireEvent.change(field, { target: { value: 'Namaste' } });

    fireEvent.click(send);
    fireEvent.submit(field.form!);

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(send.disabled).toBe(false);
    expect(send.getAttribute('aria-disabled')).toBe('true');

    await act(async () => {
      pending.resolve(true);
    });
    expect(send.hasAttribute('aria-disabled')).toBe(false);
  });

  it('keeps what the member typed while a send was in flight', async () => {
    const pending = deferred<boolean>();
    const { field } = renderComposer(vi.fn(() => pending.promise));
    fireEvent.change(field, { target: { value: 'hi' } });
    fireEvent.submit(field.form!);

    fireEvent.change(field, { target: { value: 'are you there?' } });
    await act(async () => {
      pending.resolve(true);
    });

    expect(field.value).toBe('are you there?');
  });

  it('is ready to send again if sending throws', async () => {
    const onSend = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(true);
    const { field, send } = renderComposer(onSend);
    fireEvent.change(field, { target: { value: 'hi' } });

    await act(async () => {
      fireEvent.submit(field.form!);
    });

    expect(send.hasAttribute('aria-disabled')).toBe(false);
    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't send your message. Please try again.");
    expect(field.value).toBe('hi');
  });

  it('keeps the text and says so when sending fails', async () => {
    const onSend = vi.fn().mockResolvedValue(false);
    const { field } = renderComposer(onSend);
    fireEvent.change(field, { target: { value: 'Namaste' } });

    await act(async () => {
      fireEvent.submit(field.form!);
    });

    expect(field.value).toBe('Namaste');
    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't send your message. Please try again.");
  });
});
