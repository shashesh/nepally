import React from 'react';
import { render, screen, fireEvent, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const signupMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  signUpWithEmailMock: vi.fn(),
  signInWithGoogleMock: vi.fn(),
  logClientEventMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: signupMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: signupMocks.useRouterMock }));
vi.mock('../lib/auth', () => ({
  signUpWithEmail: signupMocks.signUpWithEmailMock,
  signInWithGoogle: signupMocks.signInWithGoogleMock,
}));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    logClientEvent: signupMocks.logClientEventMock,
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

const VALID_PASSWORD = 'Password123';

/** The text of every element an element's aria-describedby points at. */
function descriptionOf(element: HTMLElement): string {
  return (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

const nameField = () => screen.getByLabelText('Full name');
const emailField = () => screen.getByLabelText('Email');
const passwordField = () => screen.getByLabelText('Password');
const createButton = () => screen.getByRole('button', { name: 'Create account' });

async function submit() {
  await act(async () => {
    fireEvent.click(createButton());
  });
}

async function submitWith(name: string, email: string, password: string) {
  fireEvent.change(nameField(), { target: { value: name } });
  fireEvent.change(emailField(), { target: { value: email } });
  fireEvent.change(passwordField(), { target: { value: password } });
  await submit();
}

describe('SignupPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    signupMocks.useRouterMock.mockReturnValue({ push: mockPush, replace: mockReplace });
    signupMocks.useAuthMock.mockReturnValue({ user: null, refreshUser: mockRefreshUser });
    signupMocks.signInWithGoogleMock.mockResolvedValue({});
    signupMocks.signUpWithEmailMock.mockResolvedValue({ user: { id: 'user-1' } });
  });

  it('renders the signup form', () => {
    render(<SignupPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Join Nepally' })).toBeDefined();
    expect(screen.getByText('Create your account to connect with the community')).toBeDefined();
    expect(nameField()).toBeDefined();
    expect(emailField()).toBeDefined();
    expect(passwordField()).toBeDefined();
    expect(createButton()).toBeDefined();
  });

  it('links to the Log in page', () => {
    render(<SignupPage />);
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login');
  });

  it('redirects a signed-in user to /feed from an effect and renders nothing', async () => {
    signupMocks.useAuthMock.mockReturnValue({ user: { id: 'user-1' }, refreshUser: mockRefreshUser });
    render(<SignupPage />);
    await act(async () => {});
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/feed');
    expect(screen.queryByRole('heading')).toBeNull();
  });

  it.each(['Bikal Shrestha', "O'Brien-Rai", 'बिकल श्रेष्ठ'])('accepts the name %s', async (name) => {
    render(<SignupPage />);
    await submitWith(name, 'test@example.com', VALID_PASSWORD);
    expect(signupMocks.signUpWithEmailMock).toHaveBeenCalledWith('test@example.com', VALID_PASSWORD, name);
  });

  it('sends the normalized name', async () => {
    render(<SignupPage />);
    await submitWith('  Bikal   Shrestha ', 'test@example.com', VALID_PASSWORD);
    expect(signupMocks.signUpWithEmailMock).toHaveBeenCalledWith(
      'test@example.com',
      VALID_PASSWORD,
      'Bikal Shrestha'
    );
  });

  it('shows a short name error on the name field', async () => {
    render(<SignupPage />);
    await submitWith('X', 'test@example.com', VALID_PASSWORD);
    expect(nameField().getAttribute('aria-invalid')).toBe('true');
    expect(descriptionOf(nameField())).toContain('Name must be at least 2 characters');
    expect(signupMocks.signUpWithEmailMock).not.toHaveBeenCalled();
  });

  it('shows an invalid email error on the email field', async () => {
    render(<SignupPage />);
    await submitWith('Test User', 'bad', VALID_PASSWORD);
    expect(emailField().getAttribute('aria-invalid')).toBe('true');
    expect(descriptionOf(emailField())).toContain('Enter a valid email address.');
    expect(signupMocks.signUpWithEmailMock).not.toHaveBeenCalled();
  });

  it('describes the password rule and shows no password error before submit', () => {
    render(<SignupPage />);
    fireEvent.change(passwordField(), { target: { value: 'abc' } });
    expect(descriptionOf(passwordField())).toContain(
      'At least 8 characters, with an uppercase letter, a lowercase letter and a number'
    );
    expect(passwordField().getAttribute('aria-invalid')).not.toBe('true');
    expect(screen.queryByText('Password must be at least 8 characters')).toBeNull();
  });

  it('lists the unmet password rules after submit, and clears them once the password is valid', async () => {
    render(<SignupPage />);
    await submitWith('Test User', 'test@example.com', 'abc');
    const description = descriptionOf(passwordField());
    expect(description).toContain('Password must be at least 8 characters');
    expect(description).toContain('Password must contain at least one uppercase letter');
    expect(description).toContain('Password must contain at least one number');
    expect(description).not.toContain('Password must contain at least one lowercase letter');
    expect(passwordField().getAttribute('aria-invalid')).toBe('true');

    fireEvent.change(passwordField(), { target: { value: VALID_PASSWORD } });
    expect(descriptionOf(passwordField())).not.toContain('Password must');
    expect(passwordField().getAttribute('aria-invalid')).not.toBe('true');
  });

  it('focuses the first invalid field on submit', async () => {
    render(<SignupPage />);
    await submitWith('Test User', 'bad', 'abc');
    expect(document.activeElement).toBe(emailField());
  });

  it('focuses the name field when everything is blank', async () => {
    render(<SignupPage />);
    await submit();
    expect(document.activeElement).toBe(nameField());
  });

  it('shows the sign-up sentence when signup fails, never the raw message', async () => {
    signupMocks.signUpWithEmailMock.mockResolvedValue({ error: new Error('Database exploded') });
    render(<SignupPage />);
    await submitWith('Test User', 'test@example.com', VALID_PASSWORD);
    expect(screen.getByRole('alert').textContent).toContain(
      "Couldn't create your account. Please try again."
    );
    expect(screen.queryByText('Database exploded')).toBeNull();
    expect(signupMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth_sign_up_failed' })
    );
  });

  it('redirects to login with the reason when the account already exists', async () => {
    signupMocks.signUpWithEmailMock.mockResolvedValue({
      error: Object.assign(new Error('User already registered'), { code: 'user_already_exists' }),
    });
    render(<SignupPage />);
    await submitWith('Test User', 'google@example.com', VALID_PASSWORD);
    expect(mockPush).toHaveBeenCalledWith('/login?reason=existing-account&email=google%40example.com');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('redirects to /verify-email on successful signup', async () => {
    render(<SignupPage />);
    await submitWith('Test User', 'test@example.com', VALID_PASSWORD);
    expect(mockRefreshUser).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/verify-email?email=test%40example.com');
  });

  it('toggles password visibility', async () => {
    render(<SignupPage />);
    expect(passwordField().getAttribute('type')).toBe('password');
    await act(async () => {
      fireEvent.mouseDown(screen.getByLabelText('Toggle password visibility'));
    });
    expect(passwordField().getAttribute('type')).toBe('text');
  });

  it('keeps Create account focusable and aria-disabled while submitting', async () => {
    // Never settles: this test only asserts the pending state.
    signupMocks.signUpWithEmailMock.mockImplementation(() => new Promise(() => {}));
    render(<SignupPage />);
    await submitWith('Test User', 'test@example.com', VALID_PASSWORD);
    const button = createButton();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    await submit();
    expect(signupMocks.signUpWithEmailMock).toHaveBeenCalledTimes(1);
  });

  it('links to the Terms of Service and Privacy Policy', () => {
    render(<SignupPage />);
    expect(screen.getByRole('link', { name: 'Terms of Service' }).getAttribute('href')).toBe('/terms');
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy');
  });

  it('renders the Google button without a phone option', () => {
    render(<SignupPage />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDefined();
    expect(screen.queryByText('Continue with Phone')).toBeNull();
  });

  it('calls signInWithGoogle when the Google button is pressed', async () => {
    render(<SignupPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    });
    expect(signupMocks.signInWithGoogleMock).toHaveBeenCalled();
  });

  it('shows the Google sentence when Google sign-in fails', async () => {
    signupMocks.signInWithGoogleMock.mockResolvedValue({
      error: new Error('Provider not enabled'),
    });
    render(<SignupPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));
    });
    expect(screen.getByRole('alert').textContent).toContain(
      "Couldn't continue with Google. Please try again."
    );
    expect(screen.queryByText('Provider not enabled')).toBeNull();
  });

  it('shows divider text for the email option', () => {
    render(<SignupPage />);
    expect(screen.getByText('or sign up with email')).toBeDefined();
  });
});
