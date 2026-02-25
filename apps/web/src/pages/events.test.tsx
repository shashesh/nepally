import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const eventsMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: eventsMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: eventsMocks.useRouterMock }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import EventsPage from './events';

describe('EventsPage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    eventsMocks.useRouterMock.mockReturnValue({ replace: mockReplace });
  });

  it('returns null and redirects to /login when user is not logged in', async () => {
    eventsMocks.useAuthMock.mockReturnValue({ user: null });
    const { container } = render(React.createElement(EventsPage));
    expect(container.firstChild).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('does not redirect when user is logged in', () => {
    eventsMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    render(React.createElement(EventsPage));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the Events Coming Soon heading when logged in', () => {
    eventsMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    render(React.createElement(EventsPage));
    expect(screen.getByText('Events Coming Soon')).toBeDefined();
  });

  it('shows the upcoming features list', () => {
    eventsMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    render(React.createElement(EventsPage));
    expect(screen.getByText('Browse upcoming events')).toBeDefined();
    expect(screen.getByText('RSVP and get reminders')).toBeDefined();
    expect(screen.getByText('Create and share events')).toBeDefined();
  });
});
