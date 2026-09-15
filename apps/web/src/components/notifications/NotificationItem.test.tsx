import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';
import { NotificationItem } from './NotificationItem';

const notification = {
  id: 'n-1',
  user_id: 'u',
  type: 'post_response',
  title: 'New comment',
  body: 'Sita replied to your post',
  data: {},
  read: false,
  read_at: null,
  sent_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
} as Notification;

describe('NotificationItem', () => {
  it('opens the notification from its main button', () => {
    const onOpen = vi.fn();
    render(<NotificationItem notification={notification} onOpen={onOpen} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /New comment/ }));
    expect(onOpen).toHaveBeenCalledWith(notification);
  });

  it('deletes from a separate button', () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(<NotificationItem notification={notification} onOpen={onOpen} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete notification' }));
    expect(onDelete).toHaveBeenCalledWith(notification);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('announces unread items', () => {
    render(<NotificationItem notification={notification} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Unread')).toBeDefined();
  });
});
