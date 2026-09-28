import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type NavigationState,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MarketplaceNavigator } from './MarketplaceNavigator';

/**
 * The real stack with stand-in screens, to check how the marketplace routes
 * stack up. Only the screens under test do anything.
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

function mockScreen(name: string) {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  // React Navigation warns about a screen component without a capitalised name.
  const StandIn = () => ReactLocal.createElement(Text, null, name);
  return { __esModule: true, default: StandIn };
}

jest.mock('../screens/marketplace/MarketplaceHomeScreen', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { useNavigation } = jest.requireActual('@react-navigation/native');
  return {
    __esModule: true,
    default: function Home() {
      const navigation = useNavigation();
      return ReactLocal.createElement(
        Text,
        { onPress: () => navigation.navigate('ListingDetail', { listingId: 'a' }) },
        'open listing a'
      );
    },
  };
});

jest.mock('../screens/marketplace/ListingDetailScreen', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { useNavigation, useRoute } = jest.requireActual('@react-navigation/native');
  return {
    __esModule: true,
    default: function Detail() {
      const navigation = useNavigation();
      const { listingId } = useRoute().params;
      return ReactLocal.createElement(
        Text,
        { onPress: () => navigation.navigate('ListingDetail', { listingId: 'b' }) },
        `listing ${listingId}: open listing b`
      );
    },
  };
});

jest.mock('../screens/marketplace/MarketplaceCategoryScreen', () => mockScreen('category'));
jest.mock('../screens/marketplace/CreateListingScreen', () => mockScreen('create'));
jest.mock('../screens/marketplace/MyListingsScreen', () => mockScreen('my listings'));
jest.mock('../screens/marketplace/BrowseCategoriesScreen', () => mockScreen('browse'));
jest.mock('../screens/marketplace/MarketplaceRulesScreen', () => mockScreen('rules'));
jest.mock('../screens/marketplace/SavedListingsScreen', () => mockScreen('saved'));
jest.mock('../screens/profile/PublicProfileScreen', () => mockScreen('profile'));
jest.mock('../screens/PostDetailScreen', () => mockScreen('post'));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderStack() {
  const ref = createNavigationContainerRef();
  render(
    <SafeAreaProvider initialMetrics={initialMetrics}>
      <NavigationContainer ref={ref}>
        <MarketplaceNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
  return ref;
}

function stackOf(state: NavigationState | undefined) {
  return state?.routes.map((route) => `${route.name}:${(route.params as { listingId?: string })?.listingId ?? ''}`);
}

describe('MarketplaceNavigator', () => {
  it('opens a second listing from a listing as its own screen, keeping the first to go back to', async () => {
    const ref = renderStack();

    await act(async () => {
      fireEvent.press(screen.getByText('open listing a'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('listing a: open listing b'));
    });

    expect(stackOf(ref.getRootState())).toEqual([
      'MarketplaceHome:',
      'ListingDetail:a',
      'ListingDetail:b',
    ]);
  });
});
