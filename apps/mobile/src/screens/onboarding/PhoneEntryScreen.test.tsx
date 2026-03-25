import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

const mockSendPhoneOTP = jest.fn();

jest.mock('../../services/auth/phoneAuth', () => ({
  sendPhoneOTP: (...args: Parameters<typeof mockSendPhoneOTP>) => mockSendPhoneOTP(...args),
}));

jest.mock('@nusa/shared', () => ({
  isValidPhoneNumber: (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
  },
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../components/buttons/PrimaryButton', () => ({
  PrimaryButton: ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="primary-button" onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/buttons/TextButton', () => ({
  TextButton: ({ title, onPress }: { title: string; onPress: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID="text-button" onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PhoneEntryScreen } from './PhoneEntryScreen';

describe('PhoneEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders name and phone inputs', () => {
    const { getByPlaceholderText, getByText } = render(<PhoneEntryScreen />);

    expect(getByText('Phone Signup')).toBeTruthy();
    expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
    expect(getByPlaceholderText('(555) 123-4567')).toBeTruthy();
  });

  it('shows validation error when name is too short', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(<PhoneEntryScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'A');
    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(getByText('Name must be at least 2 characters')).toBeTruthy();
    });
    expect(mockSendPhoneOTP).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid phone number', async () => {
    const { getByPlaceholderText, getByTestId, getByText } = render(<PhoneEntryScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '123');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(getByText('Enter a valid US phone number (10 digits)')).toBeTruthy();
    });
    expect(mockSendPhoneOTP).not.toHaveBeenCalled();
  });

  it('sends OTP and navigates to PhoneVerification on success', async () => {
    mockSendPhoneOTP.mockResolvedValueOnce({ success: true });

    const { getByPlaceholderText, getByTestId } = render(<PhoneEntryScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockSendPhoneOTP).toHaveBeenCalledWith('+15551234567');
      expect(mockNavigate).toHaveBeenCalledWith('PhoneVerification', {
        phone: '+15551234567',
        fullName: 'Test User',
      });
    });
  });

  it('shows error alert when OTP send fails', async () => {
    mockSendPhoneOTP.mockResolvedValueOnce({
      success: false,
      error: new Error('Rate limited'),
    });

    const { getByPlaceholderText, getByTestId } = render(<PhoneEntryScreen />);

    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('(555) 123-4567'), '5551234567');
    fireEvent.press(getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockSendPhoneOTP).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<PhoneEntryScreen />);

    fireEvent.press(getByTestId('text-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
