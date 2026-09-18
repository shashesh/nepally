import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  useAnimatedValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { useMetroArea } from '../../hooks/useMetroArea';
import { useAuth } from '../../hooks/useAuth';
import { addSavedLocation } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

export function MetroConfirmationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'MetroConfirmation'>>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'MetroConfirmation'>>();
  const { userId, zipCode, metroAreaId, metroName } = route.params || {};

  const { updateLocation } = useMetroArea();
  const { refreshUser } = useAuth();
  const scaleAnim = useAnimatedValue(0);
  const fadeAnim = useAnimatedValue(0);

  const handleContinue = useCallback(() => {
    navigation.navigate('Tutorial');
  }, [navigation]);

  useEffect(() => {
    // Animate checkmark
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Update user location and create first saved location
    if (userId && zipCode && metroAreaId) {
      updateLocation(userId, zipCode, metroAreaId).then(async () => {
        await refreshUser();
        // Create "Home" as the first saved location
        await addSavedLocation(supabase, userId, metroAreaId, 'Home', zipCode, true);
      });
    }

    // Auto-navigate after 2 seconds
    const timer = setTimeout(() => {
      handleContinue();
    }, 2000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, userId, zipCode, metroAreaId, updateLocation, refreshUser, handleContinue]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.content}>
        {/* Checkmark Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={120} color={colors.success} />
        </Animated.View>

        {/* Metro Name */}
        <Text style={styles.metroName}>{metroName}</Text>

        {/* Subtext */}
        <Text style={styles.subtext}>
          You&apos;ll see posts from verified community members in your area
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Continue Button */}
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.m,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.m,
  },
  metroName: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  subtext: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.m,
    lineHeight: 24,
  },
  spacer: {
    flex: 1,
  },
});
