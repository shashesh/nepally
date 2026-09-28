import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../types/navigation';
import { colors } from '../styles/colors';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import PublicProfileScreen from '../screens/profile/PublicProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';

const Stack = createNativeStackNavigator<EventsStackParamList>();

export function EventsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.primary.main,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="EventsList"
        component={EventsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateEvent"
        component={CreateEventScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      {/* An organizer's profile, from an event, and the posts it opens. */}
      <Stack.Screen
        name="PublicProfileView"
        component={PublicProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
