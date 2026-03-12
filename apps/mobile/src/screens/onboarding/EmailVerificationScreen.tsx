import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../types/navigation';
import { supabase } from '../../config/supabase';
import { createUserProfile, markEmailVerified } from '@nusa/shared';
import { AuthContext } from '../../contexts/AuthContext';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { TextButton } from '../../components/buttons/TextButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

const RESEND_COOLDOWN_SECONDS = 60;

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return email;
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (local.length === 1) return `${local}***@${domain}`;
  if (local.length === 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function EmailVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'EmailVerification'>>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'EmailVerification'>>();
  const { refreshUser } = useContext(AuthContext);

  const { email, userId, fullName } = route.params;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCooldown();
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  function startCooldown() {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function parseOtpError(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes('expired') || lower.includes('invalid otp')) {
      return 'Code expired. Request a new one.';
    }
    if (lower.includes('token') || lower.includes('invalid')) {
      return 'Invalid code. Please try again.';
    }
    return 'Verification failed. Please try again.';
  }

  async function handleVerify() {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: otpError } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'signup',
      });

      if (otpError) throw otpError;
      if (!data.user) throw new Error('Verification failed — no user returned');

      // Create profile now that email is confirmed
      const profileResult = await createUserProfile(supabase, userId, email, fullName);
      if (profileResult.error) {
        console.error('Profile creation error:', profileResult.error);
        setError('Account setup failed. Please try again.');
        return;
      }

      // Mark email verified in our users table — only safe after profile exists
      const verifyResult = await markEmailVerified(supabase, userId);
      if (verifyResult.error) {
        console.error('markEmailVerified error:', verifyResult.error);
      }

      await refreshUser();
      navigation.navigate('LocationPermission', { userId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(parseOtpError(message));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (resendError) throw resendError;

      setOtp('');
      startCooldown();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend';
      Alert.alert('Resend Failed', message);
    } finally {
      setResendLoading(false);
    }
  }

  const resendLabel =
    resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to
          </Text>
          <Text style={styles.emailDisplay}>{maskEmail(email)}</Text>
          <Text style={styles.instructions}>
            Enter the code below to verify your account.
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.otpInput, error ? styles.inputError : null]}
              value={otp}
              onChangeText={(text) => {
                setOtp(text.replace(/[^0-9]/g, '').slice(0, 6));
                if (error) setError('');
              }}
              keyboardType="number-pad"
              maxLength={6}
              placeholder="000000"
              placeholderTextColor={colors.text.disabled}
              autoFocus
              textAlign="center"
            />
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </View>

          <PrimaryButton
            title="Verify Email"
            onPress={handleVerify}
            loading={loading}
            style={styles.submitButton}
          />

          <View style={styles.resendContainer}>
            <Text style={styles.resendLabel}>{"Didn't get the code? "}</Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={resendCooldown > 0 || resendLoading}
            >
              <Text
                style={[
                  styles.resendButton,
                  (resendCooldown > 0 || resendLoading) && styles.resendDisabled,
                ]}
              >
                {resendLoading ? 'Sending...' : resendLabel}
              </Text>
            </TouchableOpacity>
          </View>

          <TextButton
            title="Use a different email? Go back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xl,
    paddingBottom: spacing.m,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  emailDisplay: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  instructions: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  otpInput: {
    width: 200,
    height: 56,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    ...typography.h2,
    color: colors.text.primary,
    letterSpacing: 8,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  submitButton: {
    width: '100%',
    marginBottom: spacing.m,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.m,
  },
  resendLabel: {
    ...typography.body,
    color: colors.text.secondary,
  },
  resendButton: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  resendDisabled: {
    color: colors.text.disabled,
  },
  backButton: {
    marginTop: spacing.s,
  },
});
