import React, { useCallback, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { useAuth } from './src/hooks/useAuth';
import { RootNavigator } from './src/navigation';
import {
  MIN_RECORD_ACTIVITY_INTERVAL_MS,
  shouldRecordSessionActivity,
} from './src/utils/sessionActivity';

function AppNavigationShell() {
  const { supabaseUser, recordActivity } = useAuth();
  const lastRecordedAtRef = useRef(0);

  const recordMeaningfulActivity = useCallback(
    (force = false) => {
      const now = Date.now();
      const shouldRecord = shouldRecordSessionActivity({
        isAuthenticated: !!supabaseUser,
        lastRecordedAt: lastRecordedAtRef.current,
        now,
        minIntervalMs: MIN_RECORD_ACTIVITY_INTERVAL_MS,
        force,
      });

      if (!shouldRecord) return;

      lastRecordedAtRef.current = now;
      void recordActivity();
    },
    [recordActivity, supabaseUser]
  );

  useEffect(() => {
    if (!supabaseUser) {
      lastRecordedAtRef.current = 0;
      return;
    }

    // Prime activity tracking as soon as an authenticated shell is mounted.
    recordMeaningfulActivity(true);

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        recordMeaningfulActivity();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [recordMeaningfulActivity, supabaseUser]);

  return (
    <NavigationContainer
      onReady={() => recordMeaningfulActivity(true)}
      onStateChange={() => recordMeaningfulActivity()}
    >
      <RootNavigator />
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <LocationProvider>
          <AppNavigationShell />
        </LocationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
