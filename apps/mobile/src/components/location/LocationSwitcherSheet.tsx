import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getShortMetroName, MAX_SAVED_LOCATIONS_PREMIUM, hasMetroChanged } from '@nusa/shared';
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
  const insets = useSafeAreaInsets();

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
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheetContainer, { paddingBottom: spacing.l + insets.bottom }]}> 
          <View style={styles.handleBar} />

          <ScrollView bounces={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Your Locations */}
          <Text style={styles.sectionHeader}>YOUR LOCATIONS</Text>

          {savedLocations.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No saved locations yet.</Text>
            </View>
          )}

          {savedLocations.map((loc) => {
            const isActive =
              activeLocation?.metro_area_id === loc.metro_area_id;
            const metroDisplay = loc.metro_area
              ? `${loc.metro_area.name}, ${loc.metro_area.state}`
              : loc.metro_area_id;

            return (
              <TouchableOpacity
                key={loc.id}
                style={[styles.locationItem, isActive && styles.locationItemActive]}
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
                    <Text style={styles.detectedSubtext}>You&apos;re currently near</Text>
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
          {savedLocations.length < MAX_SAVED_LOCATIONS_PREMIUM && (
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
          <Pressable
            style={styles.manageButton}
            onPress={handleManageLocations}
          >
            {({ pressed }) => (
              <Text style={[styles.manageButtonText, pressed && styles.manageButtonTextPressed]}>
                Manage Locations
              </Text>
            )}
          </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: '72%',
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
  scrollContent: {
    paddingBottom: spacing.m,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  emptyState: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.m,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.white,
    marginBottom: spacing.xs,
    minHeight: 60,
  },
  locationItemActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
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
    marginVertical: spacing.m,
  },
  detectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    backgroundColor: colors.primary.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary.main,
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
    paddingHorizontal: spacing.m,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: spacing.s,
    minHeight: 48,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.main,
  },
  manageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.s,
  },
  manageButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  manageButtonTextPressed: {
    textDecorationLine: 'underline',
  },
});
