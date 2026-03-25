import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const phoneMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useRouterMock: vi.fn(),
  sendPhoneOTPMock: vi.fn(),
  verifyPhoneOTPMock: vi.fn(),
  isValidPhoneNumberMock: vi.fn(),
  validateFullNameMock: vi.fn(),
  createUserProfileMock: vi.fn(),
  markPhoneVerifiedMock: vi.fn(),
  getUserByIdMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: phoneMocks.useAuthMock }));
vi.mock('next/router', () => ({ useRouter: phoneMocks.useRouterMock }));
vi.mock('../../lib/auth', () => ({
  sendPhoneOTP: phoneMocks.sendPhoneOTPMock,
  verifyPhoneOTP: phoneMocks.verifyPhoneOTPMock,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: phoneMocks.getUserMock },
  },
}));

vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    isValidPhoneNumber: phoneMocks.isValidPhoneNumberMock,
    validateFullName: phoneMocks.validateFullNameMock,
    createUserProfile: phoneMocks.createUserProfileMock,
    markPhoneVerified: phoneMocks.markPhoneVerifiedMock,
    getUserById: phoneMocks.getUserByIdMock,
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

import PhoneAuthPage from './phone.page';

describe('PhoneAuthPage', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    // Fake timers prevent the component's setInterval (resend cooldown) and
    // Mantine Transition's setTimeout from firing after test teardown.
    // Without this, Mantine's animation callback runs after jsdom is destroyed
    // and throws "window is not defined".
    // shouldAdvanceTime: true lets real time pass through so waitFor's internal
    // setTimeout still works (unlike pure fake timers which would hang waitFor).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    phoneMocks.useRouterMock.mockReturnValue({ push: mockPush, replace: mockReplace });
    phoneMocks.useAuthMock.mockReturnValue({ user: null, refreshUser: mockRefreshUser });
    phoneMocks.validateFullNameMock.mockReturnValue(true);
    phoneMocks.isValidPhoneNumberMock.mockReturnValue(true);
    phoneMocks.sendPhoneOTPMock.mockResolvedValue({ success: true });
    mockRefreshUser.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders the phone entry form', () => {
    render(<PhoneAuthPage />);
    expect(screen.getByText('Phone Signup')).toBeDefined();
    expect(screen.getByLabelText('Full Name')).toBeDefined();
    expect(screen.getByLabelText('Phone Number')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Send Verification Code' })).toBeDefined();
  });

  it('redirects to /feed when user is logged in', () => {
    phoneMocks.useAuthMock.mockReturnValue({ user: { id: 'u1' }, refreshUser: mockRefreshUser });
    render(<PhoneAuthPage />);
    expect(mockReplace).toHaveBeenCalledWith('/feed');
  });

  it('shows error when full name is invalid', async () => {
    phoneMocks.validateFullNameMock.mockReturnValue(false);
    render(<PhoneAuthPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'X' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '2125551234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Verification Code' }));
    await waitFor(() => {
      expect(screen.getByText('Please enter your full name (at least 2 characters, letters only).')).toBeDefined();
    });
  });

  it('shows error when phone is invalid', async () => {
    phoneMocks.isValidPhoneNumberMock.mockReturnValue(false);
    render(<PhoneAuthPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '555' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Verification Code' }));
    await waitFor(() => {
      expect(screen.getByText(/valid US phone/i)).toBeDefined();
    });
  });

  it('transitions to OTP step on successful send', async () => {
    render(<PhoneAuthPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '2125551234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Verification Code' }));

    await waitFor(() => {
      expect(screen.getByText('Verify Your Phone')).toBeDefined();
      expect(screen.getByText(/\*\*\*-\*\*\*-1234/)).toBeDefined();
    });
  });

  it('shows error when send OTP fails', async () => {
    phoneMocks.sendPhoneOTPMock.mockResolvedValue({
      success: false,
      error: new Error('Phone auth is not configured.'),
    });
    render(<PhoneAuthPage />);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '2125551234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Verification Code' }));

    await waitFor(() => {
      expect(screen.getByText('Phone auth is not configured.')).toBeDefined();
    });
  });

  it('shows error when OTP is not 6 digits on verify', async () => {
    render(<PhoneAuthPage />);
    // Go to OTP step
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '2125551234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Verification Code' }));

    await waitFor(() => {
      expect(screen.getByText('Verify Your Phone')).toBeDefined();
    });

    // Submit without entering OTP
    fireEvent.submit(screen.getByRole('button', { name: 'Verify' }));
    await waitFor(() => {
      expect(screen.getByText('Please enter the 6-digit code.')).toBeDefined();
    });
  });

  it('completes full verify flow and navigates to /onboarding/zip', async () => {
    phoneMocks.verifyPhoneOTPMock.mockResolvedValue({ success: true });
    phoneMocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1', email: '' } },
      error: null,
    });
    phoneMocks.createUserProfileMock.mockResolvedValue({ error: null });
    phoneMocks.markPhoneVerifiedMock.mockResolvedValue({ data: {}, error: null });
    phoneMocks.getUserByIdMock.mockResolvedValue({
      data: { id: 'user-1', metro_area_id: null },
      error: null,
    });

    render(<PhoneAuthPage />);

    // Step 1: enter phone
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '2125551234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Verification Code' }));

    await waitFor(() => {
      expect(screen.getByText('Verify Your Phone')).toBeDefined();
    });

    // Step 2: enter OTP
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => {
      expect(phoneMocks.verifyPhoneOTPMock).toHaveBeenCalledWith('+12125551234', '123456');
      expect(phoneMocks.createUserProfileMock).toHaveBeenCalled();
      expect(phoneMocks.markPhoneVerifiedMock).toHaveBeenCalled();
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/onboarding/zip');
    });
  });

  it('navigates to /feed when returning user has metro_area_id', async () => {
    phoneMocks.verifyPhoneOTPMock.mockResolvedValue({ success: true });
    phoneMocks.getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1', email: '' } },
      error: null,
    });
    phoneMocks.createUserProfileMock.mockResolvedValue({ error: null });
    phoneMocks.markPhoneVerifiedMock.mockResolvedValue({ data: {}, error: null });
    phoneMocks.getUserByIdMock.mockResolvedValue({
      data: { id: 'user-1', metro_area_id: '35620' },
      error: null,
    });

    render(<PhoneAuthPage />);

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '2125551234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Verification Code' }));

    await waitFor(() => {
      expect(screen.getByText('Verify Your Phone')).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '123456' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('back button returns to phone-entry step from OTP step', async () => {
    render(<PhoneAuthPage />);

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '2125551234' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Verification Code' }));

    await waitFor(() => {
      expect(screen.getByText('Verify Your Phone')).toBeDefined();
    });

    fireEvent.click(screen.getByText('← Back'));

    await waitFor(() => {
      expect(screen.getByText('Phone Signup')).toBeDefined();
    });
  });

  it('back button on phone-entry navigates to /signup', () => {
    render(<PhoneAuthPage />);
    fireEvent.click(screen.getByText('← Back to signup options'));
    expect(mockPush).toHaveBeenCalledWith('/signup');
  });
});
