import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootStackParamList } from '../types/navigation';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { useAuth } from '../hooks/useAuth';
import { useOnboarding } from '../hooks/useOnboarding';
import { colors } from '../styles/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, loading: authLoading } = useAuth();
  const { isComplete: onboardingComplete, loading: onboardingLoading } = useOnboarding();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for both auth and onboarding to load
    if (!authLoading && !onboardingLoading) {
      setIsReady(true);
    }
  }, [authLoading, onboardingLoading]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </View>
    );
  }

  // Show onboarding if user doesn't exist or onboarding is not complete.
  // For returning users who log in again, metro_area_id being set means
  // they already completed onboarding even if the AsyncStorage flag was cleared.
  const showOnboarding = !user || (!onboardingComplete && !user.metro_area_id);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showOnboarding ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
