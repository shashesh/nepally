import React from 'react';
import { render, screen, fireEvent, act } from '../test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const verifyMocks = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  resendSignupEmailMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('next/router', () => ({
  useRouter: verifyMocks.useRouterMock,
}));

vi.mock('../lib/auth', () => ({
  resendSignupEmail: verifyMocks.resendSignupEmailMock,
}));

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    logClientEvent: verifyMocks.logClientEventMock,
  };
});

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

import VerifyEmailPage from './verify-email.page';

const resendButton = () => screen.getByRole('button', { name: 'Resend email' });

function waitOutCooldown() {
  act(() => {
    vi.advanceTimersByTime(60_000);
  });
}

async function pressResend() {
  const button = resendButton();
  button.focus();
  await act(async () => {
    fireEvent.click(button);
  });
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    verifyMocks.useRouterMock.mockReturnValue({
      query: { email: 'test@example.com' },
    });
    verifyMocks.resendSignupEmailMock.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the check email card with the masked email', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Check your email' })).toBeDefined();
    expect(screen.getByText('t**t@example.com')).toBeDefined();
    expect(screen.getByText(/Open it to verify your account and continue\./)).toBeDefined();
  });

  it('links to Log in', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByText(/Already verified\?/)).toBeDefined();
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
  });

  it('starts Resend aria-disabled, still focusable, with the cooldown beside it', async () => {
    render(<VerifyEmailPage />);
    const button = resendButton();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText('You can resend in 60s')).toBeDefined();

    await act(async () => {
      fireEvent.click(button);
    });
    expect(verifyMocks.resendSignupEmailMock).not.toHaveBeenCalled();
  });

  it('enables Resend after 60 seconds, and pressing it resends to the email', async () => {
    render(<VerifyEmailPage />);
    waitOutCooldown();
    expect(resendButton().getAttribute('aria-disabled')).toBeNull();
    expect(screen.queryByText(/You can resend in/)).toBeNull();

    await pressResend();
    expect(verifyMocks.resendSignupEmailMock).toHaveBeenCalledWith('test@example.com');
  });

  it('confirms a resend, restarts the cooldown and keeps focus on Resend', async () => {
    render(<VerifyEmailPage />);
    waitOutCooldown();
    await pressResend();

    expect(screen.getByRole('alert').textContent).toContain('Email sent. Check your inbox.');
    expect(screen.getByText('You can resend in 60s')).toBeDefined();
    expect(resendButton().getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(resendButton());
  });

  it('keeps Resend focusable and busy while it sends', async () => {
    verifyMocks.resendSignupEmailMock.mockImplementation(() => new Promise(() => {}));
    render(<VerifyEmailPage />);
    waitOutCooldown();
    await pressResend();

    const button = resendButton();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(verifyMocks.resendSignupEmailMock).toHaveBeenCalledTimes(1);
  });

  it('shows the rate-limit sentence when Supabase refuses the resend', async () => {
    verifyMocks.resendSignupEmailMock.mockResolvedValue({
      error: Object.assign(new Error('For security purposes...'), { code: 'over_email_send_rate_limit' }),
    });
    render(<VerifyEmailPage />);
    waitOutCooldown();
    await pressResend();

    expect(screen.getByRole('alert').textContent).toContain(
      'Too many attempts. Please wait a minute and try again.'
    );
    expect(screen.queryByText('For security purposes...')).toBeNull();
    expect(verifyMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_resend_failed' })
    );
  });

  it('has no resend row without an email in the query', () => {
    verifyMocks.useRouterMock.mockReturnValue({ query: {} });
    render(<VerifyEmailPage />);
    expect(screen.getByText(/We sent a verification link to your email address\./)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Resend email' })).toBeNull();
    expect(screen.queryByText(/You can resend in/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeDefined();
  });
});
