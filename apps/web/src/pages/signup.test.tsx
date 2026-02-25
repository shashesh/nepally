import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signupMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
  validateEmailMock: vi.fn(),
  validatePasswordMock: vi.fn(),
  validateFullNameMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: signupMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: signupMocks.useRouterMock }));
vi.mock('../lib/auth', () => ({ signUpWithEmail: signupMocks.signUpWithEmailMock }));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    validateEmail: signupMocks.validateEmailMock,
    validatePassword: signupMocks.validatePasswordMock,
    validateFullName: signupMocks.validateFullNameMock,
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) =>
    React.createElement('a', { href, className }, children),
}));

import SignupPage from './signup';

describe('SignupPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    signupMocks.useRouterMock.mockReturnValue({ push: mockPush, replace: mockReplace });
    signupMocks.useAuthMock.mockReturnValue({ user: null, refreshUser: mockRefreshUser });
    signupMocks.validateFullNameMock.mockReturnValue(true);
    signupMocks.validateEmailMock.mockReturnValue(true);
    signupMocks.validatePasswordMock.mockReturnValue({ isValid: true, errors: [] });
  });

  it('renders the signup form', () => {
    render(<SignupPage />);
    expect(screen.getByText('Join NUSA')).toBeDefined();
    expect(screen.getByLabelText('Full Name')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Password')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDefined();
  });

  it('redirects to /feed when user is already logged in', () => {
    signupMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' }, refreshUser: mockRefreshUser });
    render(<SignupPage />);
    expect(mockReplace).toHaveBeenCalledWith('/feed');
  });

  it('shows error when full name is invalid', async () => {
    signupMocks.validateFullNameMock.mockReturnValue(false);
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your full name (at least 2 characters, letters only).')).toBeDefined();
    });
    expect(signupMocks.signUpWithEmailMock).not.toHaveBeenCalled();
  });

  it('shows error when email is invalid', async () => {
    signupMocks.validateEmailMock.mockReturnValue(false);
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeDefined();
    });
    expect(signupMocks.signUpWithEmailMock).not.toHaveBeenCalled();
  });

  it('shows error when password is invalid', async () => {
    signupMocks.validatePasswordMock.mockReturnValue({ isValid: false, errors: ['Too short'] });
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'bad' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByText('Please fix password issues before continuing.')).toBeDefined();
    });
  });

  it('shows password validation errors inline as user types', async () => {
    signupMocks.validatePasswordMock.mockReturnValue({
      isValid: false,
      errors: ['Password must be at least 8 characters'],
    });
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeDefined();
    });
  });

  it('shows API error when signup fails', async () => {
    signupMocks.signUpWithEmailMock.mockResolvedValue({
      error: new Error('Email already in use'),
    });
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeDefined();
    });
  });

  it('redirects to /onboarding/zip on successful signup', async () => {
    signupMocks.signUpWithEmailMock.mockResolvedValue({ user: { id: 'user-1' } });
    mockRefreshUser.mockResolvedValue(undefined);
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/onboarding/zip');
    });
  });

  it('toggles password visibility', () => {
    render(<SignupPage />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput.getAttribute('type')).toBe('password');
    fireEvent.click(screen.getByLabelText('Show password'));
    expect(passwordInput.getAttribute('type')).toBe('text');
  });

  it('shows loading state while submitting', async () => {
    signupMocks.signUpWithEmailMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 2000))
    );
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating account...' }).hasAttribute('disabled')).toBe(true);
    });
  });
});
