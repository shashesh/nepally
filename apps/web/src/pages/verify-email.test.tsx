import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const verifyMocks = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  supabaseResendMock: vi.fn(),
}));

vi.mock('next/router', () => ({
  useRouter: verifyMocks.useRouterMock,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      resend: verifyMocks.supabaseResendMock,
    },
  },
}));

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

import VerifyEmailPage from './verify-email.page';

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    verifyMocks.useRouterMock.mockReturnValue({
      query: { email: 'test@example.com' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the check email page with masked email', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByText('Check Your Email')).toBeDefined();
    expect(screen.getByText('t**t@example.com')).toBeDefined();
    expect(screen.getByText("Already verified?")).toBeDefined();
  });

  it('shows sign in link pointing to /login', () => {
    render(<VerifyEmailPage />);
    const link = screen.getByText('Sign In').closest('a');
    expect(link?.getAttribute('href')).toBe('/login');
  });

  it('resend button is disabled during initial cooldown', () => {
    render(<VerifyEmailPage />);
    const btn = screen.getByRole('button', { name: /Resend in \d+s/ });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('resend button becomes active after cooldown expires', () => {
    render(<VerifyEmailPage />);

    act(() => {
      vi.advanceTimersByTime(61000);
    });

    const btn = screen.getByRole('button', { name: 'Resend Email' });
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('calls supabase.auth.resend when resend is clicked after cooldown', async () => {
    verifyMocks.supabaseResendMock.mockResolvedValue({ error: null });
    render(<VerifyEmailPage />);

    act(() => {
      vi.advanceTimersByTime(61000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Resend Email' }));

    await waitFor(() => {
      expect(verifyMocks.supabaseResendMock).toHaveBeenCalledWith({
        type: 'signup',
        email: 'test@example.com',
      });
    });
  });

  it('shows success message after resend succeeds', async () => {
    verifyMocks.supabaseResendMock.mockResolvedValue({ error: null });
    render(<VerifyEmailPage />);

    act(() => {
      vi.advanceTimersByTime(61000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Resend Email' }));

    await waitFor(() => {
      expect(screen.getByText('Email resent! Check your inbox.')).toBeDefined();
    });
  });

  it('shows error message when resend fails', async () => {
    verifyMocks.supabaseResendMock.mockResolvedValue({
      error: new Error('Rate limited'),
    });
    render(<VerifyEmailPage />);

    act(() => {
      vi.advanceTimersByTime(61000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Resend Email' }));

    await waitFor(() => {
      expect(screen.getByText('Rate limited')).toBeDefined();
    });
  });

  it('resets cooldown after successful resend', async () => {
    verifyMocks.supabaseResendMock.mockResolvedValue({ error: null });
    render(<VerifyEmailPage />);

    act(() => {
      vi.advanceTimersByTime(61000);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Resend Email' }));

    await waitFor(() => {
      expect(verifyMocks.supabaseResendMock).toHaveBeenCalled();
    });

    // After resend, cooldown resets — button should be disabled again
    const btn = screen.getByRole('button', { name: /Resend in \d+s/ });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('shows generic email placeholder when no email query param', () => {
    verifyMocks.useRouterMock.mockReturnValue({ query: {} });
    render(<VerifyEmailPage />);
    expect(screen.getByText('your email address')).toBeDefined();
  });
});
