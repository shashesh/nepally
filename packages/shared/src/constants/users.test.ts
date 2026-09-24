import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS } from './users';

describe('DEFAULT_USER_SETTINGS', () => {
  it('matches the user_settings column defaults in 001_schema.sql', () => {
    expect(DEFAULT_USER_SETTINGS).toEqual({
      email_notifications: true,
      push_notifications: true,
      emergency_alerts: true,
      metro_area_alerts: true,
      notify_chat: 'all',
      notify_comments: true,
      notify_likes: 'grouped',
    });
  });
});
