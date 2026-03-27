import React, { useLayoutEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import {
  updateSavedLocation,
  deleteSavedLocation,
  setDefaultSavedLocation,
  MAX_SAVED_LOCATIONS_PREMIUM,
} from '@nepally/shared';
import type { SavedLocation } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { HomeStackParamList } from '../../types/navigation';

export default function ManageLocationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { user } = useAuth();
  const { savedLocations, refreshSavedLocations } = useLocation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Text style={styles.headerCount}>{savedLocations.length} of {MAX_SAVED_LOCATIONS_PREMIUM}</Text>
      ),
    });
  }, [navigation, savedLocations.length]);

  const handleStartEdit = (location: SavedLocation) => {
    setEditingId(location.id);
    setEditingLabel(location.label);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    const trimmed = editingLabel.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    // Check for duplicate names
    const isDuplicate = savedLocations.some(
      (l) => l.id !== editingId && l.label.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      Alert.alert('Duplicate Name', `You already have a location named "${trimmed}".`);
      return;
    }

    await updateSavedLocation(supabase, editingId, { label: trimmed });
    setEditingId(null);
    await refreshSavedLocations();
  };

  const handleDelete = (location: SavedLocation) => {
    if (location.is_default) return;
    if (savedLocations.length <= 1) {
      Alert.alert('Cannot Remove', 'You must have at least one saved location.');
      return;
    }

    const metroDisplay = location.metro_area
      ? `${location.metro_area.name}, ${location.metro_area.state}`
      : 'this metro area';

    Alert.alert(
      `Remove "${location.label}"?`,
      `${metroDisplay} will be removed from your saved locations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteSavedLocation(supabase, location.id);
            await refreshSavedLocations();
          },
        },
      ]
    );
  };

  const handleSetDefault = async (location: SavedLocation) => {
    if (!user) return;
    await setDefaultSavedLocation(supabase, user.id, location.id);
    await refreshSavedLocations();
  };

  const handleAddLocation = () => {
    navigation.navigate('AddLocation');
  };

  const renderLocationItem = ({ item }: { item: SavedLocation }) => {
    const isEditing = editingId === item.id;
    const metroDisplay = item.metro_area
      ? `${item.metro_area.name}, ${item.metro_area.state}`
      : item.metro_area_id;

    return (
      <View style={styles.locationItem}>
        <View style={styles.locationRow}>
          {/* Default star */}
          <View style={styles.starContainer}>
            {item.is_default && (
              <Ionicons name="star" size={18} color={colors.warning} />
            )}
          </View>

          {/* Name + metro */}
          <View style={styles.locationInfo}>
            {isEditing ? (
              <TextInput
                style={styles.editInput}
                value={editingLabel}
                onChangeText={setEditingLabel}
                onBlur={handleSaveEdit}
                onSubmitEditing={handleSaveEdit}
                autoFocus
                maxLength={30}
                selectTextOnFocus
              />
            ) : (
              <Text style={styles.locationLabel}>{item.label}</Text>
            )}
            <Text style={styles.locationMetro}>{metroDisplay}</Text>
          </View>

          {/* Action icons */}
          <View style={styles.actionIcons}>
            {!isEditing && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleStartEdit(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="create-outline" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
            {!item.is_default && savedLocations.length > 1 && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleDelete(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Set as default link */}
        {!item.is_default && (
          <TouchableOpacity
            style={styles.setDefaultLink}
            onPress={() => handleSetDefault(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.setDefaultText}>Set as default</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={savedLocations}
        keyExtractor={(item) => item.id}
        renderItem={renderLocationItem}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.footer}>
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
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerCount: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.s,
    paddingTop: spacing.xs,
    paddingBottom: spacing.l,
  },
  locationItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.s - 2,
    minHeight: 56,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    width: 24,
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: spacing.xs,
  },
  locationLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  locationMetro: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  editInput: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary.main,
    paddingVertical: 2,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: spacing.s,
    marginLeft: spacing.s,
  },
  iconButton: {
    padding: spacing.xxs,
  },
  setDefaultLink: {
    marginLeft: 32,
    marginTop: 4,
    paddingVertical: 2,
  },
  setDefaultText: {
    ...typography.caption,
    color: colors.primary.main,
  },
  footer: {
    marginTop: spacing.m,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderRadius: 10,
    paddingVertical: 12,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary.main,
  },
});
