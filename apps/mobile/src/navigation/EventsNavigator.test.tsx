import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  type NavigationState,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { EventsNavigator } from './EventsNavigator';

/**
 * The real Events stack, inside a tab as MainTabNavigator has it, with
 * stand-in screens that make the calls the real ones make.
 */

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('../screens/EventsScreen', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { useNavigation } = jest.requireActual('@react-navigation/native');
  return {
    __esModule: true,
    default: function EventsList() {
      const navigation = useNavigation();
      return ReactLocal.createElement(
        Text,
        { onPress: () => navigation.navigate('EventDetail', { eventId: 'a' }) },
        'open event a'
      );
    },
  };
});

// EventDetailScreen opens the organizer's profile with navigate('PublicProfileView').
jest.mock('../screens/EventDetailScreen', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { useNavigation, useRoute } = jest.requireActual('@react-navigation/native');
  return {
    __esModule: true,
    default: function EventDetail() {
      const navigation = useNavigation();
      const { eventId } = useRoute().params;
      return ReactLocal.createElement(
        Text,
        { onPress: () => navigation.navigate('PublicProfileView', { userId: 'organizer-1' }) },
        `event ${eventId}: open organizer`
      );
    },
  };
});

// PublicProfileScreen opens one of the member's events through the Events tab.
jest.mock('../screens/profile/PublicProfileScreen', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  const { useNavigation } = jest.requireActual('@react-navigation/native');
  return {
    __esModule: true,
    default: function Profile() {
      const navigation = useNavigation();
      return ReactLocal.createElement(
        Text,
        {
          onPress: () =>
            navigation.getParent()?.navigate('Events', {
              screen: 'EventDetail',
              params: { eventId: 'b' },
            }),
        },
        'profile: open event b'
      );
    },
  };
});

jest.mock('../screens/CreateEventScreen', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function CreateEvent() {
      return ReactLocal.createElement(Text, null, 'create');
    },
  };
});

jest.mock('../screens/PostDetailScreen', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function Post() {
      return ReactLocal.createElement(Text, null, 'post');
    },
  };
});

const Tab = createBottomTabNavigator();

function renderEventsTab() {
  const ref = createNavigationContainerRef();
  render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, left: 0, right: 0, bottom: 34 },
      }}
    >
      <NavigationContainer ref={ref}>
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="Events" component={EventsNavigator} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
  return ref;
}

function eventsStack(state: NavigationState | undefined) {
  const events = state?.routes[0].state as NavigationState | undefined;
  return events?.routes.map((route) => {
    const params = route.params as { eventId?: string; userId?: string } | undefined;
    return `${route.name}:${params?.eventId ?? params?.userId ?? ''}`;
  });
}

describe('EventsNavigator', () => {
  it("opens the organizer's profile on top of the event, and an event from there on top of that", async () => {
    const ref = renderEventsTab();

    await act(async () => {
      fireEvent.press(screen.getByText('open event a'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('event a: open organizer'));
    });
    await act(async () => {
      fireEvent.press(screen.getByText('profile: open event b'));
    });

    expect(eventsStack(ref.getRootState())).toEqual([
      'EventsList:',
      'EventDetail:a',
      'PublicProfileView:organizer-1',
      'EventDetail:b',
    ]);
  });
});
