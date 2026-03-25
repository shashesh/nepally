import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { OnboardingStackParamList } from '../../types/navigation';
import { supabase } from '../../config/supabase';
import { createUserProfile, markGoogleVerified } from '@nusa/shared';
import { AuthContext } from '../../contexts/AuthContext';
import { signInWithGoogle } from '../../services/auth/googleAuth';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, heights, borderRadius } from '../../styles/spacing';
import { TextButton } from '../../components/buttons/TextButton';

export function SignupMethodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'SignupMethod'>>();
  const { refreshUser } = useContext(AuthContext);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.error) {
        // Cancelled by user — don't show an alert
        if (result.error.message === 'Google sign-in was cancelled') return;
        throw result.error;
      }

      if (!result.user) throw new Error('No user returned from Google sign-in');

      const userId = result.user.id;
      const email = result.user.email;
      const fullName = result.user.full_name || 'Google User';

      // Create profile if new user (will fail silently for existing users)
      const profileResult = await createUserProfile(supabase, userId, email, fullName);
      if (profileResult.error) {
        const isDuplicate = profileResult.error.message?.includes('duplicate') ||
          profileResult.error.message?.includes('already exists');
        if (!isDuplicate) {
          console.error('Profile creation error:', profileResult.error);
          Alert.alert('Error', 'Account setup failed. Please try again.');
          return;
        }
      }

      // Mark Google verified → trust_level: 1
      const verifyResult = await markGoogleVerified(supabase, userId);
      if (verifyResult.error) {
        console.error('markGoogleVerified error:', verifyResult.error);
      }

      await refreshUser();

      // Check if user already has metro_area set (returning user)
      const { data: userData } = await supabase
        .from('users')
        .select('metro_area_id')
        .eq('id', userId)
        .single();

      if (userData?.metro_area_id) {
        // Returning user with location — AuthContext will route to Main
        return;
      }

      navigation.navigate('LocationPermission', { userId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      Alert.alert('Google Sign-In Failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePhoneSignup = () => {
    navigation.navigate('PhoneEntry');
  };

  const handleEmailSignup = () => {
    navigation.navigate('EmailSignup', { mode: 'signup' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.content}>
        {/* Header */}
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>
          Choose your preferred signup method
        </Text>

        {/* Signup Options */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleGoogleSignup}
            activeOpacity={0.7}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator size={24} color={colors.error} />
            ) : (
              <Ionicons name="logo-google" size={24} color={colors.error} />
            )}
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Continue with Google</Text>
              <Text style={styles.optionSubtext}>Quick and secure</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handlePhoneSignup}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={24} color={colors.success} />
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Continue with Phone</Text>
              <Text style={styles.optionSubtext}>Verify via SMS code</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleEmailSignup}
            activeOpacity={0.7}
          >
            <Ionicons name="mail" size={24} color={colors.primary.main} />
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Continue with Email</Text>
              <Text style={styles.optionSubtext}>Traditional signup</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Privacy Reassurance */}
        <View style={styles.reassurance}>
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
          <Text style={styles.reassuranceText}>
            We never share your personal info
          </Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TextButton
            title="Log In"
            onPress={() => navigation.navigate('EmailSignup', { mode: 'login' })}
          />
        </View>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.m,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.l,
  },
  optionsContainer: {
    gap: spacing.s,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing.s,
    minHeight: heights.button.primary + spacing.s,
  },
  optionContent: {
    flex: 1,
    marginLeft: spacing.s,
  },
  optionLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  optionSubtext: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  reassurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.m,
    padding: spacing.s,
    backgroundColor: colors.background,
    borderRadius: borderRadius.input,
  },
  reassuranceText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  spacer: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
