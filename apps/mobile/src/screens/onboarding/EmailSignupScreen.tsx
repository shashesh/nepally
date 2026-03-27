import React, { useState, useContext } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabase';
import { APP_CONFIG } from '@nepally/shared';
import { AuthContext } from '../../contexts/AuthContext';
import { markOnboardingComplete } from '../../utils/storage';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { TextButton } from '../../components/buttons/TextButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

type Mode = 'signup' | 'login';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function EmailSignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'EmailSignup'>>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'EmailSignup'>>();
  const { refreshUser } = useContext(AuthContext);

  const [mode, setMode] = useState<Mode>(route.params?.mode || 'signup');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (mode === 'signup' && fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }

    if (password.length < APP_CONFIG.minPasswordLength) {
      newErrors.password = `Password must be at least ${APP_CONFIG.minPasswordLength} characters`;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Signup failed — no user returned');

      // Profile creation happens after email verification in EmailVerificationScreen
      navigation.navigate('EmailVerification', {
        email: email.trim(),
        userId: data.user.id,
        fullName: fullName.trim(),
      });
    } catch (error: unknown) {
      Alert.alert('Signup Failed', getErrorMessage(error, 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      await refreshUser();

      // Check if user already has metro area set
      const { data: userData } = await supabase
        .from('users')
        .select('metro_area_id')
        .eq('id', data.user.id)
        .single();

      if (userData?.metro_area_id) {
        // Returning user — mark onboarding complete so RootNavigator switches to Main
        await markOnboardingComplete();
      } else {
        navigation.navigate('LocationPermission', { userId: data.user.id });
      }
    } catch (error: unknown) {
      Alert.alert('Login Failed', getErrorMessage(error, 'Invalid credentials'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = mode === 'signup' ? handleSignup : handleLogin;
  const isSignup = mode === 'signup';

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
          {/* Header */}
          <Text style={styles.title}>
            {isSignup ? 'Create Your Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignup
              ? 'Sign up with your email'
              : 'Log in to your account'}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {isSignup && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[styles.input, errors.fullName && styles.inputError]}
                  placeholder="Your full name"
                  placeholderTextColor={colors.text.disabled}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                  autoComplete="name"
                />
                {errors.fullName && (
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                )}
              </View>
            )}

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="you@example.com"
                placeholderTextColor={colors.text.disabled}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputFlex, errors.password && styles.inputError]}
                  placeholder={`At least ${APP_CONFIG.minPasswordLength} characters`}
                  placeholderTextColor={colors.text.disabled}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {isSignup && (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputFlex,
                      errors.confirmPassword && styles.inputError,
                    ]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={colors.text.disabled}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    autoComplete="new-password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirm(!showConfirm)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>
                    {errors.confirmPassword}
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Submit Button */}
          <PrimaryButton
            title={isSignup ? 'Sign Up' : 'Log In'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />

          {/* Toggle mode */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignup
                ? 'Already have an account? '
                : "Don't have an account? "}
            </Text>
            <TextButton
              title={isSignup ? 'Log In' : 'Sign Up'}
              onPress={() => {
                setMode(isSignup ? 'login' : 'signup');
                setErrors({});
              }}
            />
          </View>
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
  form: {
    gap: spacing.m,
    marginBottom: spacing.l,
  },
  fieldContainer: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    ...typography.body,
    color: colors.text.primary,
  },
  inputFlex: {
    flex: 1,
    paddingRight: 48,
  },
  inputError: {
    borderColor: colors.error,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  submitButton: {
    marginBottom: spacing.m,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});
