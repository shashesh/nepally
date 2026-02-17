import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../types/navigation';
import {
  WelcomeScreen,
  SignupMethodScreen,
  EmailSignupScreen,
  LocationPermissionScreen,
  ZipCodeEntryScreen,
  MetroConfirmationScreen,
  TutorialScreen,
} from '../screens/onboarding';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignupMethod" component={SignupMethodScreen} />
      <Stack.Screen name="EmailSignup" component={EmailSignupScreen} />
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      <Stack.Screen name="ZipCodeEntry" component={ZipCodeEntryScreen} />
      <Stack.Screen name="MetroConfirmation" component={MetroConfirmationScreen} />
      <Stack.Screen name="Tutorial" component={TutorialScreen} />
    </Stack.Navigator>
  );
}
