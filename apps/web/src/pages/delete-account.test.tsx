import React from 'react';
import { render, screen } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ useAuth: vi.fn(), useRouter: vi.fn() }));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));
vi.mock('../components/account/DeleteAccountFlow', () => ({
  DeleteAccountFlow: () => React.createElement('p', null, 'The delete flow'),
}));

import DeleteAccountPage from './delete-account.page';

function routerWith(query: Record<string, string>, isReady = true) {
  mocks.useRouter.mockReturnValue({ query, isReady });
}

describe('DeleteAccountPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerWith({});
    mocks.useAuth.mockReturnValue({ supabaseUser: null });
  });

  it('renders nothing until the router is ready', () => {
    routerWith({}, false);
    render(<DeleteAccountPage />);
    // Mantine's provider injects a <style> element, so check for content, not an empty container.
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText('The delete flow')).toBeNull();
  });

  it('runs the flow for anyone with a session', () => {
    mocks.useAuth.mockReturnValue({ supabaseUser: { id: 'user-1' } });
    render(<DeleteAccountPage />);
    expect(screen.getByText('The delete flow')).toBeDefined();
  });

  it('tells a signed-out visitor how deletion works and how to start it', () => {
    render(<DeleteAccountPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Delete your Nepally account' })
    ).toBeDefined();
    expect(screen.getByText(/29 days/)).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'Sign in to delete your account' }).getAttribute('href')
    ).toBe('/login?redirect=%2Fdelete-account');
    expect(screen.getByRole('link', { name: 'support@nepally.us' }).getAttribute('href')).toBe(
      'mailto:support@nepally.us'
    );
  });

  it('confirms the date after a request', () => {
    routerWith({ scheduled: '2026-10-30T12:00:00.000Z' });
    render(<DeleteAccountPage />);

    expect(
      screen.getByText(
        'Your account will be deleted on October 30, 2026. Sign in before then to restore it.'
      )
    ).toBeDefined();
  });

  it('ignores a scheduled date that is not a date', () => {
    routerWith({ scheduled: 'nope' });
    render(<DeleteAccountPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Delete your Nepally account' })
    ).toBeDefined();
  });

  it('says so after a Google re-auth as a different account', () => {
    routerWith({ reauth: 'wrong-account' });
    render(<DeleteAccountPage />);

    expect(screen.getByText(/You signed in as a different account/)).toBeDefined();
  });
});
