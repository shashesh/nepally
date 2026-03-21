import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const marketplaceMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: marketplaceMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: marketplaceMocks.useRouterMock }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

import MarketplacePage from './marketplace.page';

describe('MarketplacePage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    marketplaceMocks.useRouterMock.mockReturnValue({ replace: mockReplace });
  });

  it('returns null and redirects to /login when user is not logged in', async () => {
    marketplaceMocks.useAuthMock.mockReturnValue({ user: null });
    render(React.createElement(MarketplacePage));
    expect(screen.queryByText('Marketplace Coming Soon')).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('does not redirect when user is logged in', () => {
    marketplaceMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    render(React.createElement(MarketplacePage));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('shows the Marketplace Coming Soon heading when logged in', () => {
    marketplaceMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    render(React.createElement(MarketplacePage));
    expect(screen.getByText('Marketplace Coming Soon')).toBeDefined();
  });

  it('shows the upcoming features list', () => {
    marketplaceMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' } });
    render(React.createElement(MarketplacePage));
    expect(screen.getByText('Find local businesses')).toBeDefined();
    expect(screen.getByText('Read reviews and ratings')).toBeDefined();
    expect(screen.getByText('Connect with service providers')).toBeDefined();
    expect(screen.getByText('Support community businesses')).toBeDefined();
  });
});
