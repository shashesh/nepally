import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventsStackParamList } from '../types/navigation';
import { colors } from '../styles/colors';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import CreateEventScreen from '../screens/CreateEventScreen';

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
    </Stack.Navigator>
  );
}
