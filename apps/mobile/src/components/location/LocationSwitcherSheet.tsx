import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getShortMetroName, MAX_SAVED_LOCATIONS, hasMetroChanged } from '@nusa/shared';
import type { SavedLocation, ActiveLocation, LocationDetectionResult } from '@nusa/shared';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { HomeStackParamList } from '../../types/navigation';

interface LocationSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
  savedLocations: SavedLocation[];
  activeLocation: ActiveLocation | null;
  detectedLocation: LocationDetectionResult | null;
  onSelectSaved: (location: SavedLocation) => void;
  onSelectDetected: () => void;
}

export function LocationSwitcherSheet({
  visible,
  onClose,
  savedLocations,
  activeLocation,
  detectedLocation,
  onSelectSaved,
  onSelectDetected,
}: LocationSwitcherSheetProps) {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const showDetected =
    detectedLocation &&
    activeLocation &&
    hasMetroChanged(activeLocation.metro_area_id, detectedLocation.metro_area_id);

  const handleAddLocation = () => {
    onClose();
    navigation.navigate('AddLocation');
  };

  const handleManageLocations = () => {
    onClose();
    navigation.navigate('ManageLocations');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.sheetContainer}>
        <View style={styles.handleBar} />

        <ScrollView bounces={false} style={styles.scrollView}>
          {/* Your Locations */}
          <Text style={styles.sectionHeader}>YOUR LOCATIONS</Text>

          {savedLocations.map((loc) => {
            const isActive =
              activeLocation?.metro_area_id === loc.metro_area_id;
            const metroDisplay = loc.metro_area
              ? `${loc.metro_area.name}, ${loc.metro_area.state}`
              : loc.metro_area_id;

            return (
              <TouchableOpacity
                key={loc.id}
                style={styles.locationItem}
                onPress={() => onSelectSaved(loc)}
                activeOpacity={0.7}
              >
                <View style={styles.locationItemLeft}>
                  {loc.is_default ? (
                    <Ionicons name="star" size={16} color={colors.warning} />
                  ) : (
                    <View style={styles.starPlaceholder} />
                  )}
                  <View>
                    <Text style={styles.locationLabel}>{loc.label}</Text>
                    <Text style={styles.locationMetro}>{metroDisplay}</Text>
                  </View>
                </View>
                {isActive && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary.main}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Detected Location */}
          {showDetected && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>DETECTED LOCATION</Text>
              <TouchableOpacity
                style={styles.detectedItem}
                onPress={onSelectDetected}
                activeOpacity={0.7}
              >
                <View style={styles.detectedLeft}>
                  <Ionicons name="navigate" size={18} color={colors.primary.main} />
                  <View>
                    <Text style={styles.detectedSubtext}>You're currently near</Text>
                    <Text style={styles.detectedMetro}>
                      {getShortMetroName(detectedLocation!.metro_name)}, {detectedLocation!.metro_state}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </>
          )}

          <View style={styles.divider} />

          {/* Add a Location */}
          {savedLocations.length < MAX_SAVED_LOCATIONS && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddLocation}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary.main} />
              <Text style={styles.addButtonText}>Add a Location</Text>
            </TouchableOpacity>
          )}

          {/* Manage Locations */}
          <TouchableOpacity
            style={styles.manageLink}
            onPress={handleManageLocations}
            activeOpacity={0.7}
          >
            <Text style={styles.manageLinkText}>Manage Locations</Text>
          </TouchableOpacity>
        </ScrollView>
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
    paddingTop: 12,
    paddingBottom: spacing.l,
    maxHeight: '60%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.s,
  },
  scrollView: {
    paddingHorizontal: spacing.s,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 60,
  },
  locationItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  starPlaceholder: {
    width: 16,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  locationMetro: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.s,
  },
  detectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: 12,
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
    minHeight: 60,
  },
  detectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  detectedSubtext: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  detectedMetro: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.main,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.s,
    paddingVertical: 12,
    minHeight: 48,
  },
  addButtonText: {
    fontSize: 15,
    color: colors.primary.main,
  },
  manageLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  manageLinkText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
