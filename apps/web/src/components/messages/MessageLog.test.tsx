import React from 'react';
import { render, screen, within } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, ConversationWithParticipant } from '@nepally/shared';
import { MessageLog } from './MessageLog';

const VIEWER = 'viewer-1';
const PARTNER: ConversationWithParticipant = {
  id: 'conv-1',
  last_message: null,
  last_message_time: null,
  created_at: '2026-09-20T10:00:00Z',
  other_user_id: 'partner-1',
  other_user_name: 'Bikal Shrestha',
  other_user_photo: null,
  unread_count: 0,
};

function message(id: string, senderId: string, at: Date, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    conversation_id: 'conv-1',
    sender_id: senderId,
    text: `text ${id}`,
    type: 'text',
    read: false,
    read_at: null,
    timestamp: at.toISOString(),
    ...overrides,
  };
}

const YESTERDAY = new Date(2026, 8, 22, 18);
const TODAY = new Date(2026, 8, 23, 9);

function setScroll({ scrollY, innerHeight, scrollHeight }: { scrollY: number; innerHeight: number; scrollHeight: number }) {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: innerHeight });
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: scrollHeight });
  window.dispatchEvent(new Event('scroll'));
}

describe('MessageLog', () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 23, 12));
    // jsdom doesn't implement window.scrollTo.
    scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    scrollTo.mockRestore();
  });

  function renderLog(messages: ChatMessage[]) {
    return render(<MessageLog messages={messages} viewerId={VIEWER} partner={PARTNER} />);
  }

  it('is a log named for the partner, by public name', () => {
    renderLog([message('m1', 'partner-1', TODAY)]);

    expect(screen.getByRole('log', { name: 'Messages with Bikal S.' })).toBeDefined();
  });

  it('announces new messages only, not a receipt or time changing', () => {
    renderLog([message('m1', 'partner-1', TODAY)]);

    expect(screen.getByRole('log').getAttribute('aria-relevant')).toBe('additions');
  });

  it('heads each day with its label', () => {
    renderLog([message('m1', 'partner-1', YESTERDAY), message('m2', VIEWER, TODAY)]);

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Yesterday', 'Today']);
  });

  it("says whether the viewer's own messages were read, and nothing on received ones", () => {
    renderLog([
      message('m1', 'partner-1', TODAY),
      message('m2', VIEWER, TODAY, { read: true }),
      message('m3', VIEWER, TODAY),
    ]);

    const log = screen.getByRole('log');
    const bubble = (text: string) => within(log).getByText(text).closest('[data-message]') as HTMLElement;
    expect(bubble('text m1').textContent).not.toMatch(/Read|Sent/);
    expect(bubble('text m2').textContent).toContain('Read');
    expect(bubble('text m3').textContent).toContain('Sent');
  });

  it('has nothing to tab to: the avatars beside messages are decorative', () => {
    renderLog([message('m1', 'partner-1', TODAY), message('m2', 'partner-1', TODAY)]);

    const log = screen.getByRole('log');
    expect(within(log).queryAllByRole('button')).toHaveLength(0);
    expect(within(log).queryAllByRole('img')).toHaveLength(0);
  });

  describe('scrolling', () => {
    it('scrolls to the newest message on first render', () => {
      renderLog([message('m1', 'partner-1', TODAY)]);

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it("scrolls to the viewer's own new message wherever they were", () => {
      const first = [message('m1', 'partner-1', TODAY)];
      const { rerender } = renderLog(first);
      setScroll({ scrollY: 0, innerHeight: 600, scrollHeight: 3000 });
      scrollTo.mockClear();

      rerender(<MessageLog messages={[...first, message('m2', VIEWER, TODAY)]} viewerId={VIEWER} partner={PARTNER} />);

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('scrolls to the very end of the page, below the composer too', () => {
      Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 4200 });
      renderLog([message('m1', 'partner-1', TODAY)]);

      expect(scrollTo).toHaveBeenCalledWith({ top: 4200 });
    });

    it('keeps following after its own scroll to the end', () => {
      const first = [message('m1', 'partner-1', TODAY)];
      const { rerender } = renderLog(first);
      // The scroll it just made lands exactly at the end of the page.
      setScroll({ scrollY: 2400, innerHeight: 600, scrollHeight: 3000 });
      scrollTo.mockClear();

      rerender(
        <MessageLog messages={[...first, message('m2', 'partner-1', TODAY)]} viewerId={VIEWER} partner={PARTNER} />
      );

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('does not scroll when the newest message only changes, e.g. is read', () => {
      const first = [message('m1', VIEWER, TODAY)];
      const { rerender } = renderLog(first);
      scrollTo.mockClear();

      rerender(<MessageLog messages={[{ ...first[0], read: true }]} viewerId={VIEWER} partner={PARTNER} />);

      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('follows an incoming message when the viewer is at the bottom', () => {
      const first = [message('m1', 'partner-1', TODAY)];
      const { rerender } = renderLog(first);
      setScroll({ scrollY: 0, innerHeight: 600, scrollHeight: 3000 });
      setScroll({ scrollY: 2350, innerHeight: 600, scrollHeight: 3000 });
      scrollTo.mockClear();

      rerender(
        <MessageLog messages={[...first, message('m2', 'partner-1', TODAY)]} viewerId={VIEWER} partner={PARTNER} />
      );

      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('leaves a viewer reading back where they are when a message arrives', () => {
      const first = [message('m1', 'partner-1', TODAY)];
      const { rerender } = renderLog(first);
      setScroll({ scrollY: 0, innerHeight: 600, scrollHeight: 3000 });
      scrollTo.mockClear();

      rerender(
        <MessageLog messages={[...first, message('m2', 'partner-1', TODAY)]} viewerId={VIEWER} partner={PARTNER} />
      );

      expect(scrollTo).not.toHaveBeenCalled();
    });
  });
});
