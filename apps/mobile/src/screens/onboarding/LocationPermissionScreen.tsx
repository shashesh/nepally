import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { TextButton } from '../../components/buttons/TextButton';
import {
  requestLocationPermission,
  detectLocationMetro,
} from '../../services/location';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

export function LocationPermissionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { userId } = route.params || {};

  const [loading, setLoading] = useState(false);

  const handleEnableLocation = async () => {
    setLoading(true);

    try {
      const status = await requestLocationPermission();

      if (status !== 'granted') {
        // User denied — proceed to manual ZIP entry
        navigation.navigate('ZipCodeEntry', { userId });
        return;
      }

      // Permission granted — detect location
      const result = await detectLocationMetro();

      if (result) {
        // GPS success — go straight to MetroConfirmation pre-filled
        navigation.navigate('MetroConfirmation', {
          userId,
          zipCode: result.zip_code,
          metroAreaId: result.metro_area_id,
          metroName: `${result.metro_name}, ${result.metro_state}`,
          fromGps: true,
        });
      } else {
        // GPS failed or timeout — fall back to manual
        Alert.alert(
          'Location Not Found',
          "We couldn't detect your location. Please enter your ZIP code instead."
        );
        navigation.navigate('ZipCodeEntry', { userId });
      }
    } catch (error) {
      console.error('Location permission/detection error:', error);
      navigation.navigate('ZipCodeEntry', { userId });
    } finally {
      setLoading(false);
    }
  };

  const handleNotNow = () => {
    navigation.navigate('ZipCodeEntry', { userId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationCircle}>
            <Ionicons name="location" size={64} color={colors.primary.main} />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          NUSA works best with{'\n'}your location
        </Text>

        {/* Body Text */}
        <Text style={styles.body}>
          We use your location to show you community posts, housing, jobs, and
          events near you.
        </Text>

        {/* Privacy Assurance */}
        <View style={styles.privacyRow}>
          <Ionicons name="lock-closed" size={16} color={colors.text.secondary} />
          <Text style={styles.privacyText}>
            Your exact location is never shared — we only use it to determine
            your metro area.
          </Text>
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Enable Location Button */}
        <PrimaryButton
          title={loading ? 'Getting your location...' : 'Enable Location'}
          onPress={handleEnableLocation}
          loading={loading}
          disabled={loading}
          style={styles.enableButton}
        />

        {/* Not Now */}
        <TextButton
          title="Not Now"
          onPress={handleNotNow}
          style={styles.notNowButton}
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
    paddingTop: 80,
    paddingBottom: spacing.l,
    alignItems: 'center',
  },
  illustrationContainer: {
    marginBottom: spacing.l,
  },
  illustrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.s,
  },
  body: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
    marginBottom: spacing.s,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    maxWidth: 300,
  },
  privacyText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 24,
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  enableButton: {
    width: '100%',
    marginBottom: spacing.s,
  },
  notNowButton: {
    marginBottom: spacing.m,
  },
});
