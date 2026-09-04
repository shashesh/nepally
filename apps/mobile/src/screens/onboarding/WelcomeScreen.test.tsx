jest.mock('@nepally/shared', () => ({
  LEGAL_URLS: {
    privacy: 'https://nepally.us/privacy',
    terms: 'https://nepally.us/terms',
    guidelines: 'https://nepally.us/guidelines',
    help: 'https://nepally.us/help',
  },
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../components/buttons/PrimaryButton', () => ({
  PrimaryButton: ({ title, onPress }: { title: string; onPress: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('../../components/buttons/SecondaryButton', () => ({
  SecondaryButton: ({ title, onPress }: { title: string; onPress: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  },
}));

import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { WelcomeScreen } from './WelcomeScreen';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  it('navigates to signup and login', () => {
    const { getByText } = render(<WelcomeScreen />);

    fireEvent.press(getByText('Sign Up'));
    expect(mockNavigate).toHaveBeenCalledWith('SignupMethod');

    fireEvent.press(getByText('Log In'));
    expect(mockNavigate).toHaveBeenCalledWith('EmailSignup', { mode: 'login' });
  });

  it('opens the Terms of Service in the browser', () => {
    const { getByText } = render(<WelcomeScreen />);

    fireEvent.press(getByText('Terms of Service'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://nepally.us/terms');
  });

  it('opens the Privacy Policy in the browser', () => {
    const { getByText } = render(<WelcomeScreen />);

    fireEvent.press(getByText('Privacy Policy'));

    expect(Linking.openURL).toHaveBeenCalledWith('https://nepally.us/privacy');
  });
});
