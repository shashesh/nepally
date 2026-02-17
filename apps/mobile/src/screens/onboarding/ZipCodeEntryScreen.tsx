import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ZipCodeInput } from '../../components/inputs/ZipCodeInput';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { TextButton } from '../../components/buttons/TextButton';
import { useMetroArea } from '../../hooks/useMetroArea';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

export function ZipCodeEntryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params || {};

  const [zipCode, setZipCode] = useState('');
  const [isValid, setIsValid] = useState(false);
  const { fetchMetroByZip, loading, error } = useMetroArea();

  const handleContinue = async () => {
    if (!isValid) return;

    const metroArea = await fetchMetroByZip(zipCode);

    if (metroArea) {
      navigation.navigate('MetroConfirmation', {
        userId,
        zipCode,
        metroAreaId: metroArea.id,
        metroName: `${metroArea.name}, ${metroArea.state}`,
      });
    }
  };

  const handleSkip = () => {
    navigation.navigate('Tutorial');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.inner}>
          {/* Header */}
          <Text style={styles.title}>Where are you located?</Text>
          <Text style={styles.subtitle}>
            We'll show you posts from your metro area
          </Text>

          {/* ZIP Code Input */}
          <View style={styles.inputContainer}>
            <ZipCodeInput
              value={zipCode}
              onChangeText={setZipCode}
              onValidChange={setIsValid}
              error={error || undefined}
              autoFocus
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💡 Your ZIP code helps us connect you with nearby community members. We only show posts within your metro area.
            </Text>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Buttons */}
          <View style={styles.buttonsContainer}>
            <PrimaryButton
              title="Continue"
              onPress={handleContinue}
              disabled={!isValid}
              loading={loading}
            />

            <View style={styles.skipContainer}>
              <TextButton
                title="Skip for now"
                onPress={handleSkip}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  },
  inner: {
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
  inputContainer: {
    marginBottom: spacing.m,
  },
  infoBox: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.card,
    padding: spacing.s,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.main,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    gap: spacing.s,
  },
  skipContainer: {
    alignItems: 'center',
  },
});
