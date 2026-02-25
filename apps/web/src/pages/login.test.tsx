import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  signInWithEmailMock: vi.fn(),
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
}));

vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
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

import LoginPage from './login';

describe('LoginPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    loginMocks.useRouterMock.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    loginMocks.useAuthMock.mockReturnValue({
      user: null,
      refreshUser: mockRefreshUser,
    });
    loginMocks.validateEmailMock.mockReturnValue(true);
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

  it('toggles password field type when eye button is clicked', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput.getAttribute('type')).toBe('password');
    fireEvent.click(screen.getByLabelText('Show password'));
    expect(passwordInput.getAttribute('type')).toBe('text');
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(passwordInput.getAttribute('type')).toBe('password');
  });

  it('disables submit button and shows loading text while signing in', async () => {
    loginMocks.signInWithEmailMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }));
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: 'Signing in...' });
      expect(btn).toBeDefined();
      expect(btn.hasAttribute('disabled')).toBe(true);
    });
  });
});
