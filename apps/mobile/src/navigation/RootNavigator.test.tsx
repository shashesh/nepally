const mockUseAuth = jest.fn();
const mockUseOnboarding = jest.fn();

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../hooks/useOnboarding', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

// The real navigators pull in every screen; stand-ins are enough to see which
// branch RootNavigator picked.
jest.mock('./OnboardingNavigator', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { OnboardingNavigator: () => ReactLocal.createElement(Text, null, 'onboarding flow') };
});

jest.mock('./MainTabNavigator', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { MainTabNavigator: () => ReactLocal.createElement(Text, null, 'main tabs') };
});

jest.mock('./ChatNavigator', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { ChatNavigator: () => ReactLocal.createElement(Text, null, 'chat') };
});

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './RootNavigator';

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function navigatorTree() {
  return (
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function renderNavigator() {
  return render(navigatorTree());
}

function setLoadState({
  authLoading,
  onboardingLoading,
  user = null,
}: {
  authLoading: boolean;
  onboardingLoading: boolean;
  user?: { id: string; metro_area_id?: string } | null;
}) {
  mockUseAuth.mockReturnValue({ user, loading: authLoading });
  mockUseOnboarding.mockReturnValue({ loading: onboardingLoading });
}

function expectNoNavigator() {
  expect(screen.queryByText('onboarding flow')).toBeNull();
  expect(screen.queryByText('main tabs')).toBeNull();
}

describe('RootNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('waits while auth is still loading', () => {
    setLoadState({ authLoading: true, onboardingLoading: false });
    renderNavigator();
    expectNoNavigator();
  });

  it('waits while onboarding state is still loading', () => {
    setLoadState({ authLoading: false, onboardingLoading: true, user: { id: 'user-1', metro_area_id: '19100' } });
    renderNavigator();
    expectNoNavigator();
  });

  it('shows onboarding once loaded when signed out', () => {
    setLoadState({ authLoading: false, onboardingLoading: false });
    renderNavigator();
    expect(screen.getByText('onboarding flow')).toBeTruthy();
  });

  it('shows onboarding once loaded for a user without a metro area', () => {
    setLoadState({ authLoading: false, onboardingLoading: false, user: { id: 'user-1' } });
    renderNavigator();
    expect(screen.getByText('onboarding flow')).toBeTruthy();
  });

  it('shows the main tabs once both have loaded for a user with a metro area', () => {
    setLoadState({ authLoading: false, onboardingLoading: false, user: { id: 'user-1', metro_area_id: '19100' } });
    renderNavigator();
    expect(screen.getByText('main tabs')).toBeTruthy();
  });

  it('switches from waiting to the app when loading finishes', () => {
    setLoadState({ authLoading: true, onboardingLoading: true, user: { id: 'user-1', metro_area_id: '19100' } });
    renderNavigator();
    expectNoNavigator();

    setLoadState({ authLoading: false, onboardingLoading: false, user: { id: 'user-1', metro_area_id: '19100' } });
    screen.rerender(navigatorTree());
    expect(screen.getByText('main tabs')).toBeTruthy();
  });
});
