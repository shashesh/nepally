import React from 'react';
import { render, screen, fireEvent, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: loginMocks.useAuthMock,
}));

vi.mock('next/router', () => ({
  useRouter: loginMocks.useRouterMock,
}));

vi.mock('../lib/auth', () => ({
  signInWithEmail: loginMocks.signInWithEmailMock,
  signInWithGoogle: loginMocks.signInWithGoogleMock,
}));

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    logClientEvent: loginMocks.logClientEventMock,
  };
});

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    React.createElement('a', { href, className }, children),
}));

import LoginPage from './login.page';

/** The text of every element an element's aria-describedby points at. */
function descriptionOf(element: HTMLElement): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

function emailField() {
  return screen.getByLabelText('Email');
}

function passwordField() {
  return screen.getByLabelText('Password');
}

function logInButton() {
  return screen.getByRole('button', { name: 'Log in' });
}

async function submitWith(email: string, password: string) {
  fireEvent.change(emailField(), { target: { value: email } });
  fireEvent.change(passwordField(), { target: { value: password } });
  await act(async () => {
    fireEvent.click(logInButton());
  });
}

describe('LoginPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    loginMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
      isReady: true,
    });
    loginMocks.useAuthMock.mockReturnValue({
      user: null,
      refreshUser: mockRefreshUser,
    });
    loginMocks.signInWithGoogleMock.mockResolvedValue({});
  });

  it('renders the login form', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeDefined();
    expect(screen.getByText('Log in to your Nepally account')).toBeDefined();
    expect(emailField()).toBeDefined();
    expect(passwordField()).toBeDefined();
    expect(logInButton()).toBeDefined();
  });

  it('links to the Sign up page', () => {
    render(<LoginPage />);
    expect(screen.getByRole('link', { name: 'Sign up' }).getAttribute('href')).toBe('/signup');
  });

  it('redirects a signed-in user to /feed from an effect and renders nothing', async () => {
    loginMocks.useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      refreshUser: mockRefreshUser,
    });
    render(<LoginPage />);
    await act(async () => {});
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/feed');
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows no field errors before the first submit', () => {
    render(<LoginPage />);
    expect(emailField().getAttribute('aria-invalid')).not.toBe('true');
    expect(passwordField().getAttribute('aria-invalid')).not.toBe('true');
  });

  it('flags a blank email on submit and focuses it', async () => {
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(logInButton());
    });
    expect(emailField().getAttribute('aria-invalid')).toBe('true');
    expect(descriptionOf(emailField())).toContain('Enter a valid email address.');
    expect(document.activeElement).toBe(emailField());
    expect(loginMocks.signInWithEmailMock).not.toHaveBeenCalled();
  });

  it('clears the email error as soon as the email becomes valid', async () => {
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(logInButton());
    });
    fireEvent.change(emailField(), { target: { value: 'test@example.com' } });
    expect(emailField().getAttribute('aria-invalid')).not.toBe('true');
    expect(screen.queryByText('Enter a valid email address.')).toBeNull();
  });

  it('flags an empty password on submit and focuses it', async () => {
    render(<LoginPage />);
    await submitWith('test@example.com', '');
    expect(passwordField().getAttribute('aria-invalid')).toBe('true');
    expect(descriptionOf(passwordField())).toContain('Enter your password.');
    expect(document.activeElement).toBe(passwordField());
    expect(loginMocks.signInWithEmailMock).not.toHaveBeenCalled();
  });

  it('shows a sentence for invalid credentials, never the raw message', async () => {
    loginMocks.signInWithEmailMock.mockResolvedValue({
      error: Object.assign(new Error('Invalid login credentials'), { code: 'invalid_credentials' }),
    });
    render(<LoginPage />);
    await submitWith('test@example.com', 'wrongpassword');
    expect(screen.getByRole('alert').textContent).toContain(
      "That email and password don't match. Check them and try again."
    );
    expect(screen.queryByText('Invalid login credentials')).toBeNull();
    expect(loginMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_log_in_failed' })
    );
  });

  it('falls back to the log-in sentence for an unknown error', async () => {
    loginMocks.signInWithEmailMock.mockResolvedValue({ error: new Error('boom') });
    render(<LoginPage />);
    await submitWith('test@example.com', 'password');
    expect(screen.getByRole('alert').textContent).toContain("Couldn't log you in. Please try again.");
  });

  it('refreshes the user and goes to /feed on success', async () => {
    loginMocks.signInWithEmailMock.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    mockRefreshUser.mockResolvedValue(undefined);
    render(<LoginPage />);
    await submitWith('test@example.com', 'correctpassword');
    expect(loginMocks.signInWithEmailMock).toHaveBeenCalledWith('test@example.com', 'correctpassword');
    expect(mockRefreshUser).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/feed');
  });

  it('toggles password field type when visibility button is clicked', async () => {
    render(<LoginPage />);
    expect(passwordField().getAttribute('type')).toBe('password');
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Toggle password visibility'));
    });
    expect(passwordField().getAttribute('type')).toBe('text');
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Toggle password visibility'));
    });
    expect(passwordField().getAttribute('type')).toBe('password');
  });

  it('keeps Log in focusable and aria-disabled while signing in, and ignores a second press', async () => {
    // Never settles: this test only asserts the pending state.
    loginMocks.signInWithEmailMock.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);
    await submitWith('test@example.com', 'password');
    const button = logInButton();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    await act(async () => {
      fireEvent.click(button);
    });
    expect(loginMocks.signInWithEmailMock).toHaveBeenCalledTimes(1);
  });

  it('renders the Google button without a phone option', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDefined();
    expect(screen.queryByText('Continue with Phone')).toBeNull();
  });

  it('calls signInWithGoogle when the Google button is pressed', async () => {
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    });
    expect(loginMocks.signInWithGoogleMock).toHaveBeenCalled();
  });

  it('shows the Google sentence when Google sign-in fails', async () => {
    loginMocks.signInWithGoogleMock.mockResolvedValue({
      error: new Error('Provider not enabled'),
    });
    render(<LoginPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    });
    expect(screen.getByRole('alert').textContent).toContain(
      "Couldn't continue with Google. Please try again."
    );
    expect(screen.queryByText('Provider not enabled')).toBeNull();
  });

  it('shows the email divider text', () => {
    render(<LoginPage />);
    expect(screen.getByText('or log in with email')).toBeDefined();
  });

  it('shows info message when redirected with reason=existing-account', () => {
    loginMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: { reason: 'existing-account', email: 'test@example.com' },
      isReady: true,
    });
    render(<LoginPage />);
    expect(screen.getByText(/account with this email already exists/i)).toBeDefined();
    expect((emailField() as HTMLInputElement).value).toBe('test@example.com');
  });

  it('pre-fills the email from the query once the router becomes ready', () => {
    loginMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
      isReady: false,
    });
    const { rerender } = render(<LoginPage />);
    expect((emailField() as HTMLInputElement).value).toBe('');
    expect(screen.queryByText(/account with this email already exists/i)).toBeNull();

    loginMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: { reason: 'existing-account', email: 'ready@example.com' },
      isReady: true,
    });
    rerender(<LoginPage />);
    expect((emailField() as HTMLInputElement).value).toBe('ready@example.com');
    expect(screen.getByText(/account with this email already exists/i)).toBeDefined();
  });

  it('keeps an edited email across re-renders with the same query', () => {
    loginMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: { email: 'test@example.com' },
      isReady: true,
    });
    const { rerender } = render(<LoginPage />);
    fireEvent.change(emailField(), { target: { value: 'typed@example.com' } });
    rerender(<LoginPage />);
    expect((emailField() as HTMLInputElement).value).toBe('typed@example.com');
  });
});
