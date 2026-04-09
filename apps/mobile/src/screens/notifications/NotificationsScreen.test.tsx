import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NotificationsScreen } from './NotificationsScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({ children }: { children: unknown }) =>
      ReactModule.createElement(View, null, children),
  };
});

const mockUseAuth = jest.fn();
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockSetOptions = jest.fn();

const mockGetNotifications = jest.fn();
const mockMarkNotificationRead = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();
const mockDeleteNotification = jest.fn();
const realtimeSubscriptions: Array<{
  event: unknown;
  filter: unknown;
  callback: (payload: unknown) => void;
}> = [];

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    getParent: () => ({ navigate: mockParentNavigate }),
  }),
}));

jest.mock('../../config/supabase', () => {
  const channelRef = {
    on: jest.fn().mockImplementation((event, filter, callback) => {
      realtimeSubscriptions.push({ event, filter, callback });
      return channelRef;
    }),
    subscribe: jest.fn().mockReturnThis(),
  };
  return {
    supabase: {
      channel: jest.fn(() => channelRef),
      removeChannel: jest.fn(),
    },
  };
});

jest.mock('@nepally/shared', () => ({
  getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
  markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
  markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
  deleteNotification: (...args: unknown[]) => mockDeleteNotification(...args),
  resolveNotificationRouteTarget: jest.requireActual('@nepally/shared').resolveNotificationRouteTarget,
}));

function baseNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'notif-1',
    user_id: 'user-1',
    type: 'system',
    title: 'Notification title',
    body: 'Notification body',
    data: {},
    read: true,
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

async function renderAndSettle() {
  const utils = render(<NotificationsScreen />);
  await act(async () => {});
  await act(async () => {});
  return utils;
}

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    realtimeSubscriptions.length = 0;
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } });
    mockGetNotifications.mockResolvedValue({ data: [] });
    mockMarkNotificationRead.mockResolvedValue({});
    mockMarkAllNotificationsRead.mockResolvedValue({});
    mockDeleteNotification.mockResolvedValue({});
  });

  it('routes message notifications to MessageThread when sender metadata exists', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
        baseNotification({
          type: 'message',
          title: 'New message',
          data: { conversation_id: 'conv-1', sender_id: 'user-2', sender_name: 'Asha' },
        }),
      ],
    });

    const { getByText } = await renderAndSettle();

    fireEvent.press(getByText('New message'));

    expect(mockParentNavigate).toHaveBeenCalledWith('Chat', {
      screen: 'MessageThread',
      params: {
        conversationId: 'conv-1',
        otherUserId: 'user-2',
        otherUserName: 'Asha',
        otherUserTrustLevel: 1,
        otherUserPhotoUrl: null,
      },
    });
  });

  it('routes event notifications to EventDetail in Events stack', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
        baseNotification({
          title: 'Event reminder',
          data: { event_id: 'event-1' },
        }),
      ],
    });

    const { getByText } = await renderAndSettle();

    fireEvent.press(getByText('Event reminder'));

    expect(mockParentNavigate).toHaveBeenCalledWith('Main', {
      screen: 'Events',
      params: {
        screen: 'EventDetail',
        params: { eventId: 'event-1' },
      },
    });
  });

  it('falls back to Notifications route for malformed payloads', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
        baseNotification({
          type: 'message',
          title: 'Malformed payload',
          data: { conversation_id: 123 },
        }),
      ],
    });

    const { getByText } = await renderAndSettle();

    fireEvent.press(getByText('Malformed payload'));

    expect(mockNavigate).toHaveBeenCalledWith('Notifications');
  });

  it('adds message notifications from realtime inserts', async () => {
    mockGetNotifications.mockResolvedValue({ data: [] });

    const { getByText } = await renderAndSettle();

    const notificationInsertSubscription = realtimeSubscriptions.find((sub) => {
      const filter = sub.filter as { table?: string; event?: string };
      return filter?.table === 'notifications' && filter?.event === 'INSERT';
    });

    expect(notificationInsertSubscription).toBeDefined();

    await act(async () => {
      notificationInsertSubscription?.callback({
        new: baseNotification({
          id: 'notif-realtime',
          type: 'message',
          title: 'Realtime message',
          data: { conversation_id: 'conv-2', sender_id: 'user-7' },
        }),
      });
    });

    expect(getByText('Realtime message')).toBeTruthy();
  });

  it('keeps notification visible when delete fails', async () => {
    mockGetNotifications.mockResolvedValue({
      data: [
        baseNotification({
          id: 'notif-delete-fail',
          title: 'Delete should fail',
          read: false,
        }),
      ],
    });
    mockDeleteNotification.mockResolvedValue({ error: new Error('RLS delete blocked') });

    const { getByText, getByLabelText } = await renderAndSettle();

    fireEvent.press(getByLabelText('Dismiss notification'));

    await waitFor(() => {
      expect(mockDeleteNotification).toHaveBeenCalledWith(expect.anything(), 'notif-delete-fail');
    });
    // Notification should remain visible when delete fails
    expect(getByText('Delete should fail')).toBeTruthy();
  });
});
