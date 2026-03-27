import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../buttons/PrimaryButton';
import { getShortMetroName } from '@nepally/shared';
import type { LocationDetectionResult, ActiveLocation } from '@nepally/shared';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';

interface LocationChangeSheetProps {
  visible: boolean;
  detectedLocation: LocationDetectionResult | null;
  activeLocation: ActiveLocation | null;
  onBrowse: () => void;
  onUpdate: () => void;
  onKeep: () => void;
  onSnooze: (metroAreaId: string) => void;
}

export function LocationChangeSheet({
  visible,
  detectedLocation,
  activeLocation,
  onBrowse,
  onUpdate,
  onKeep,
  onSnooze,
}: LocationChangeSheetProps) {
  const [snoozeChecked, setSnoozeChecked] = useState(false);

  if (!detectedLocation || !activeLocation) return null;

  const detectedShortName = getShortMetroName(detectedLocation.metro_name);
  const activeShortName = getShortMetroName(activeLocation.metro_name);

  const handleBrowse = () => {
    if (snoozeChecked) {
      onSnooze(detectedLocation.metro_area_id);
    }
    onBrowse();
    setSnoozeChecked(false);
  };

  const handleUpdate = () => {
    if (snoozeChecked) {
      onSnooze(detectedLocation.metro_area_id);
    }
    onUpdate();
    setSnoozeChecked(false);
  };

  const handleKeep = () => {
    if (snoozeChecked) {
      onSnooze(detectedLocation.metro_area_id);
    }
    onKeep();
    setSnoozeChecked(false);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleKeep}
    >
      <TouchableWithoutFeedback onPress={handleKeep} accessibilityLabel="Dismiss location prompt">
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetContainer}>
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Location icon */}
        <Ionicons name="location-sharp" size={48} color={colors.primary.main} style={styles.icon} />

        {/* Headline */}
        <Text style={styles.headlineText}>It looks like you&apos;re in</Text>
        <Text style={styles.metroName}>{detectedShortName}</Text>

        {/* Body */}
        <Text style={styles.body}>
          Would you like to see community posts from this area?
        </Text>

        {/* Browse button (primary) */}
        <PrimaryButton
          title={`Browse ${detectedShortName}`}
          onPress={handleBrowse}
          style={styles.primaryBtn}
        />

        {/* Update button (outlined) */}
        <TouchableOpacity
          style={styles.outlinedBtn}
          onPress={handleUpdate}
          activeOpacity={0.7}
        >
          <Text style={styles.outlinedBtnText}>Update My Location</Text>
        </TouchableOpacity>

        {/* Keep link */}
        <TouchableOpacity onPress={handleKeep} activeOpacity={0.7}>
          <Text style={styles.keepLink}>Keep {activeShortName}</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Snooze checkbox */}
        <TouchableOpacity
          style={styles.snoozeRow}
          onPress={() => setSnoozeChecked(!snoozeChecked)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={snoozeChecked ? 'checkbox' : 'square-outline'}
            size={20}
            color={snoozeChecked ? colors.primary.main : colors.text.secondary}
          />
          <Text style={styles.snoozeText}>Don&apos;t ask again for 24 hours</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.m,
    paddingTop: 20,
    paddingBottom: spacing.l,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.s,
  },
  icon: {
    marginBottom: spacing.s,
  },
  headlineText: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.text.primary,
  },
  metroName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  body: {
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: spacing.m,
    lineHeight: 22,
  },
  primaryBtn: {
    marginBottom: 12,
  },
  outlinedBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.primary.main,
    borderRadius: borderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  outlinedBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  keepLink: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.s,
  },
  snoozeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  snoozeText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
