import React, { createRef } from 'react';
import { act, fireEvent, render, screen } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';
import { NotificationList, type NotificationListProps } from './NotificationList';

const NOW = new Date(2026, 8, 24, 15);

function notification(id: string, sentAt: Date, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    user_id: 'u1',
    type: 'post_response',
    title: `Title ${id}`,
    body: '',
    data: {},
    read: false,
    read_at: null,
    sent_at: sentAt.toISOString(),
    ...overrides,
  };
}

const TODAY_A = notification('a', new Date(2026, 8, 24, 12));
const TODAY_B = notification('b', new Date(2026, 8, 24, 9));
const YESTERDAY = notification('c', new Date(2026, 8, 23, 18));
const EMERGENCY = notification('e', new Date(2026, 8, 24, 8), { type: 'emergency_alert' });

function renderList(props: Partial<NotificationListProps> = {}) {
  const fallback = createRef<HTMLButtonElement>();
  const baseProps: NotificationListProps = {
    notifications: [TODAY_A, TODAY_B, YESTERDAY],
    now: NOW,
    onOpen: vi.fn(),
    onDelete: vi.fn().mockResolvedValue(true),
    getFallbackFocus: () => fallback.current,
    ...props,
  };
  const utils = render(
    <>
      <NotificationList {...baseProps} />
      <button ref={fallback}>Preferences</button>
    </>
  );
  const rerenderList = (next: Partial<NotificationListProps>) =>
    utils.rerender(
      <>
        <NotificationList {...baseProps} {...next} />
        <button ref={fallback}>Preferences</button>
      </>
    );
  return { ...utils, props: baseProps, rerenderList };
}

describe('NotificationList', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('groups emergency alerts first, then each day', () => {
    renderList({ notifications: [TODAY_A, EMERGENCY, YESTERDAY] });

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Emergency alerts', 'Today', 'Yesterday']);
  });

  it('names each section by its heading', () => {
    renderList({ notifications: [TODAY_A, EMERGENCY, YESTERDAY] });

    expect(screen.getByRole('region', { name: 'Emergency alerts' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Yesterday' })).toBeDefined();
  });

  it('puts no emoji in a heading', () => {
    renderList({ notifications: [TODAY_A, EMERGENCY, YESTERDAY] });

    for (const heading of screen.getAllByRole('heading', { level: 2 })) {
      expect(heading.textContent).toMatch(/^[\w ,]+$/);
    }
  });

  it('opens and deletes a notification from its own buttons', () => {
    const { props } = renderList();

    fireEvent.click(screen.getByRole('button', { name: /Title b/ }));
    expect(props.onOpen).toHaveBeenCalledWith(TODAY_B);

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[1]);
    expect(props.onDelete).toHaveBeenCalledWith(TODAY_B);
  });

  it('moves focus to the row that took a deleted row’s place', async () => {
    const { rerenderList } = renderList();

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[1]);
    });
    (document.activeElement as HTMLElement | null)?.blur();
    rerenderList({ notifications: [TODAY_A, YESTERDAY] });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Title c/ }));
  });

  it('moves focus to the row before when the last row goes', async () => {
    const { rerenderList } = renderList();

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[2]);
    });
    (document.activeElement as HTMLElement | null)?.blur();
    rerenderList({ notifications: [TODAY_A, TODAY_B] });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Title b/ }));
  });

  it('falls back when the only row goes', async () => {
    const { rerenderList } = renderList({ notifications: [TODAY_A] });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete notification' }));
    });
    (document.activeElement as HTMLElement | null)?.blur();
    rerenderList({ notifications: [] });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Preferences' }));
  });

  it('leaves focus where the member moved it', async () => {
    const { rerenderList } = renderList();

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[0]);
    });
    const elsewhere = screen.getByRole('button', { name: 'Preferences' });
    elsewhere.focus();
    rerenderList({ notifications: [TODAY_B, YESTERDAY] });

    expect(document.activeElement).toBe(elsewhere);
  });

  it('does not move focus when the delete failed', async () => {
    const onDelete = vi.fn().mockResolvedValue(false);
    const { rerenderList } = renderList({ onDelete });

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[0]);
    });
    (document.activeElement as HTMLElement | null)?.blur();
    rerenderList({ notifications: [TODAY_A, TODAY_B, YESTERDAY], now: new Date(NOW) });

    expect(document.activeElement).toBe(document.body);
  });
});
