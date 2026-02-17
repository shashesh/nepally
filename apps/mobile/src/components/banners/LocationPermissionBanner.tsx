import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  shouldShowPermissionBanner,
  PERMISSION_BANNER_MAX_SHOWS,
  PERMISSION_BANNER_COOLDOWN_DAYS,
} from '@nusa/shared';
import { getLocationPermissionStatus } from '../../services/location';
import {
  getPermissionBannerState,
  savePermissionBannerState,
} from '../../utils/storage';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export function LocationPermissionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, []);

  async function checkShouldShow() {
    const permStatus = await getLocationPermissionStatus();
    if (permStatus !== 'denied') return;

    const state = await getPermissionBannerState();
    if (
      shouldShowPermissionBanner(
        state.show_count,
        state.last_shown_at,
        PERMISSION_BANNER_MAX_SHOWS,
        PERMISSION_BANNER_COOLDOWN_DAYS
      )
    ) {
      setVisible(true);
    }
  }

  const handleTurnOn = () => {
    Linking.openSettings();
  };

  const handleDismiss = async () => {
    setVisible(false);
    const state = await getPermissionBannerState();
    await savePermissionBannerState({
      show_count: state.show_count + 1,
      last_shown_at: new Date().toISOString(),
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="location-outline" size={18} color={colors.primary.main} />
      <Text style={styles.bannerText}>
        Enable location for a better experience.{' '}
        <Text style={styles.turnOnLink} onPress={handleTurnOn}>
          Turn On
        </Text>
      </Text>
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.s,
    paddingVertical: 10,
    gap: spacing.xs,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  turnOnLink: {
    fontWeight: '700',
    color: colors.primary.main,
  },
});
