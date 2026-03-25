import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const signupMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
  validateEmailMock: vi.fn(),
  validatePasswordMock: vi.fn(),
  validateFullNameMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: signupMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: signupMocks.useRouterMock }));
vi.mock('../lib/auth', () => ({ signUpWithEmail: signupMocks.signUpWithEmailMock, signInWithGoogle: signupMocks.signInWithGoogleMock }));
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
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

import SignupPage from './signup.page';

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
    signupMocks.signInWithGoogleMock.mockResolvedValue({});
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

  it('redirects to login with reason when email is already registered', async () => {
    signupMocks.signUpWithEmailMock.mockResolvedValue({
      error: new Error('User already registered'),
    });
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'google@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?reason=existing-account&email=google%40example.com');
    });
  });

  it('redirects to /verify-email on successful signup', async () => {
    signupMocks.signUpWithEmailMock.mockResolvedValue({ user: { id: 'user-1' } });
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123!' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(mockRefreshUser).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(
        '/verify-email?email=test%40example.com'
      );
    });
  });

  it('toggles password visibility', async () => {
    render(<SignupPage />);
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Toggle password visibility'));
    });
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
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
      const btn = screen.getByRole('button', { name: 'Create Account' });
      expect(btn.hasAttribute('disabled')).toBe(true);
      expect(btn.getAttribute('data-loading')).toBe('true');
    });
  });

  it('renders Google and Phone signup buttons', () => {
    render(<SignupPage />);
    expect(screen.getByText('Continue with Google')).toBeDefined();
    expect(screen.getByText('Continue with Phone')).toBeDefined();
  });

  it('calls signInWithGoogle when Google button is clicked', async () => {
    render(<SignupPage />);
    fireEvent.click(screen.getByText('Continue with Google'));
    await waitFor(() => {
      expect(signupMocks.signInWithGoogleMock).toHaveBeenCalled();
    });
  });

  it('shows error when Google sign-in fails', async () => {
    signupMocks.signInWithGoogleMock.mockResolvedValue({
      error: new Error('Provider not enabled'),
    });
    render(<SignupPage />);
    fireEvent.click(screen.getByText('Continue with Google'));
    await waitFor(() => {
      expect(screen.getByText('Provider not enabled')).toBeDefined();
    });
  });

  it('navigates to /auth/phone when Phone button is clicked', () => {
    render(<SignupPage />);
    fireEvent.click(screen.getByText('Continue with Phone'));
    expect(mockPush).toHaveBeenCalledWith('/auth/phone');
  });

  it('shows divider text for email option', () => {
    render(<SignupPage />);
    expect(screen.getByText('or sign up with email')).toBeDefined();
  });
});
