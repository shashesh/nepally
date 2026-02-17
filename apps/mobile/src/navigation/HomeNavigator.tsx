import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../types/navigation';
import HomeScreen from '../screens/HomeScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import AddLocationScreen from '../screens/location/AddLocationScreen';
import ManageLocationsScreen from '../screens/location/ManageLocationsScreen';
import { colors } from '../styles/colors';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.primary.main,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ title: '' }}
      />
      <Stack.Screen
        name="AddLocation"
        component={AddLocationScreen}
        options={{ title: 'Add a Location' }}
      />
      <Stack.Screen
        name="ManageLocations"
        component={ManageLocationsScreen}
        options={{ title: 'Manage Locations' }}
      />
    </Stack.Navigator>
  );
}
