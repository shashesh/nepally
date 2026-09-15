import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
  validateEmailMock: vi.fn(),
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
    validateEmail: loginMocks.validateEmailMock,
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
    loginMocks.validateEmailMock.mockReturnValue(true);
    loginMocks.signInWithGoogleMock.mockResolvedValue({});
  });

  it('renders the login form', () => {
    render(<LoginPage />);
    expect(screen.getByText('Welcome Back')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDefined();
  });

  it('renders link to Sign Up page', () => {
    render(<LoginPage />);
    const signUpLink = screen.getByText('Sign Up');
    expect(signUpLink.closest('a')?.getAttribute('href')).toBe('/signup');
  });

  it('redirects to /feed when user is already logged in', () => {
    loginMocks.useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      refreshUser: mockRefreshUser,
    });
    render(<LoginPage />);
    expect(mockReplace).toHaveBeenCalledWith('/feed');
  });

  it('shows validation error when email is invalid', async () => {
    loginMocks.validateEmailMock.mockReturnValue(false);
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'somepassword' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeDefined();
    });
    expect(loginMocks.signInWithEmailMock).not.toHaveBeenCalled();
  });

  it('shows error when password field is empty', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    // Leave password empty
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your password.')).toBeDefined();
    });
    expect(loginMocks.signInWithEmailMock).not.toHaveBeenCalled();
  });

  it('shows API error message when sign in fails', async () => {
    loginMocks.signInWithEmailMock.mockResolvedValue({
      error: new Error('Invalid login credentials'),
    });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeDefined();
    });
  });

  it('redirects to /feed on successful sign in', async () => {
    loginMocks.signInWithEmailMock.mockResolvedValue({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    mockRefreshUser.mockResolvedValue(undefined);
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correctpassword' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('toggles password field type when visibility button is clicked', async () => {
    render(<LoginPage />);
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Toggle password visibility'));
    });
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Toggle password visibility'));
    });
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  });

  it('disables submit button while signing in', async () => {
    // Never settles: this test only asserts the pending state. A mock that
    // resolves on a real timer outlives the test — cleanup unmounts the page,
    // then the success path resumes and calls the shared mockPush inside
    // whichever test is running by then. No timer, nothing to resume.
    loginMocks.signInWithEmailMock.mockImplementation(() => new Promise(() => {}));
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Sign In' });
      // Mantine renders `loading` as a disabled native <button>; assert that
      // user-observable state rather than Mantine's data-loading attribute.
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });

  it('renders Google sign-in button without phone option', () => {
    render(<LoginPage />);
    expect(screen.getByText('Continue with Google')).toBeDefined();
    expect(screen.queryByText('Continue with Phone')).toBeNull();
  });

  it('calls signInWithGoogle when Google button is clicked', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continue with Google'));
    await waitFor(() => {
      expect(loginMocks.signInWithGoogleMock).toHaveBeenCalled();
    });
  });

  it('shows error when Google sign-in fails', async () => {
    loginMocks.signInWithGoogleMock.mockResolvedValue({
      error: new Error('Provider not enabled'),
    });
    render(<LoginPage />);
    fireEvent.click(screen.getByText('Continue with Google'));
    await waitFor(() => {
      expect(screen.getByText('Provider not enabled')).toBeDefined();
    });
  });

  it('shows email divider text', () => {
    render(<LoginPage />);
    expect(screen.getByText('or sign in with email')).toBeDefined();
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
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('test@example.com');
  });
});
