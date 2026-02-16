import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, heights, borderRadius } from '../../styles/spacing';
import { TextButton } from '../../components/buttons/TextButton';

export function SignupMethodScreen() {
  const navigation = useNavigation<any>();

  const handleComingSoon = (method: string) => {
    Alert.alert(
      'Coming Soon',
      `${method} signup will be available in a future update. Please use email signup for now.`
    );
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
            style={[styles.optionCard, styles.optionCardDisabled]}
            onPress={() => handleComingSoon('Google')}
            activeOpacity={0.7}
          >
            <Ionicons name="logo-google" size={24} color={colors.error} />
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Continue with Google</Text>
              <Text style={styles.optionSubtext}>Coming soon</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.optionCardDisabled]}
            onPress={() => handleComingSoon('Phone')}
            activeOpacity={0.7}
          >
            <Ionicons name="call" size={24} color={colors.success} />
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>Continue with Phone</Text>
              <Text style={styles.optionSubtext}>Coming soon</Text>
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
  optionCardDisabled: {
    opacity: 0.5,
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
