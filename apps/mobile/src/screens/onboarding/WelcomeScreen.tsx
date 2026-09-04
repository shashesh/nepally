import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp, type ParamListBase } from '@react-navigation/native';
import { LEGAL_URLS } from '@nepally/shared';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { SecondaryButton } from '../../components/buttons/SecondaryButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

export function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const handleSignUp = () => {
    navigation.navigate('SignupMethod');
  };

  const handleLogIn = () => {
    navigation.navigate('EmailSignup', { mode: 'login' });
  };

  const openLegalPage = (url: string) => {
    Linking.openURL(url).catch(() => {
      // The device has no browser handler; nothing else to do here.
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>Nepally</Text>
          </View>
        </View>

        {/* Tagline */}
        <Text style={styles.title}>
          Your Local Nepali{'\n'}Community in the USA
        </Text>

        {/* Value Proposition */}
        <Text style={styles.description}>
          Find housing, jobs, and emergency help from verified community members in your metro area.
        </Text>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Buttons */}
        <View style={styles.buttonsContainer}>
          <PrimaryButton
            title="Sign Up"
            onPress={handleSignUp}
            style={styles.button}
          />

          <SecondaryButton
            title="Log In"
            onPress={handleLogIn}
            style={styles.button}
          />
        </View>

        {/* Terms Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to{'\n'}
            <Text
              style={styles.link}
              accessibilityRole="link"
              onPress={() => openLegalPage(LEGAL_URLS.terms)}
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.link}
              accessibilityRole="link"
              onPress={() => openLegalPage(LEGAL_URLS.privacy)}
            >
              Privacy Policy
            </Text>
          </Text>
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    ...typography.h2,
    color: colors.white,
    fontWeight: 'bold',
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  description: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.s,
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    gap: spacing.s,
  },
  button: {
    width: '100%',
  },
  footer: {
    marginTop: spacing.m,
    alignItems: 'center',
  },
  footerText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: colors.primary.main,
    textDecorationLine: 'underline',
  },
});
