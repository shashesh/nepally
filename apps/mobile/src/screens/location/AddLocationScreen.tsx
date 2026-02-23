import React, { useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import {
  searchMetroAreas,
  getMetroByZip,
  isValidZipCode,
  addSavedLocation,
  SUGGESTED_LOCATION_LABELS,
} from '@nusa/shared';
import type { MetroArea } from '@nusa/shared';
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

export default function AddLocationScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { savedLocations, refreshSavedLocations } = useLocation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MetroArea[]>([]);
  const [selectedMetro, setSelectedMetro] = useState<MetroArea | null>(null);
  const [label, setLabel] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Names already used by saved locations
  const usedLabels = savedLocations.map((l) => l.label.toLowerCase());

  // Get default label suggestion
  const suggestedDefault = SUGGESTED_LOCATION_LABELS.find(
    (l) => !usedLabels.includes(l.toLowerCase())
  );

  const handleSearch = useCallback(
    async (text: string) => {
      setQuery(text);
      setError('');

      if (text.length < 2) {
        setResults([]);
        return;
      }

      setSearching(true);

      try {
        // If it looks like a ZIP code, look up directly
        if (isValidZipCode(text)) {
          const zipResult = await getMetroByZip(supabase, text);
          if (zipResult.data) {
            setResults([zipResult.data]);
          } else {
            setResults([]);
          }
        } else {
          const result = await searchMetroAreas(supabase, text);
          setResults(result.data ?? []);
        }
      } catch {
        setError('Search failed. Please try again.');
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const handleSelectMetro = (metro: MetroArea) => {
    setSelectedMetro(metro);
    setLabel(suggestedDefault ?? '');
  };

  const handleSave = async () => {
    if (!user || !selectedMetro) return;

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError('Please enter a name for this location.');
      return;
    }

    if (usedLabels.includes(trimmedLabel.toLowerCase())) {
      setError(`You already have a location named "${trimmedLabel}".`);
      return;
    }

    setSaving(true);
    const result = await addSavedLocation(
      supabase,
      user.id,
      selectedMetro.id,
      trimmedLabel
    );
    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      await refreshSavedLocations();
      navigation.goBack();
    }
  };

  const handleChipPress = (chipLabel: string) => {
    setLabel(chipLabel);
    setError('');
  };

  // Step 1: Search for metro
  if (!selectedMetro) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content}>
          <Text style={styles.label}>Search by metro name or ZIP code</Text>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={colors.text.disabled}
              value={query}
              onChangeText={handleSearch}
              autoFocus
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelectMetro(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.resultText}>
                  {item.name}, {item.state}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.length >= 2 && !searching ? (
                <Text style={styles.emptyText}>
                  No metro areas found for &quot;{query}&quot;
                </Text>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Step 2: Name the location
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* Selected metro */}
        <View style={styles.selectedMetroRow}>
          <Ionicons name="location" size={20} color={colors.primary.main} />
          <Text style={styles.selectedMetroText}>
            {selectedMetro.name}, {selectedMetro.state}
          </Text>
        </View>

        {/* Name input */}
        <Text style={styles.label}>Name this location</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="e.g. Mom's Place"
          placeholderTextColor={colors.text.disabled}
          value={label}
          onChangeText={(text) => {
            setLabel(text);
            setError('');
          }}
          maxLength={30}
          autoFocus
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Suggestion chips */}
        <Text style={styles.suggestionsLabel}>Suggestions:</Text>
        <View style={styles.chipsRow}>
          {SUGGESTED_LOCATION_LABELS.filter(
            (l) => !usedLabels.includes(l.toLowerCase())
          ).map((chipLabel) => (
            <TouchableOpacity
              key={chipLabel}
              style={[
                styles.chip,
                label === chipLabel && styles.chipActive,
              ]}
              onPress={() => handleChipPress(chipLabel)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  label === chipLabel && styles.chipTextActive,
                ]}
              >
                {chipLabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.spacer} />

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!label.trim() || saving) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!label.trim() || saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Location'}
          </Text>
        </TouchableOpacity>

        {/* Back to search */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => setSelectedMetro(null)}
          activeOpacity={0.7}
        >
          <Text style={styles.backLinkText}>Search for a different metro</Text>
        </TouchableOpacity>
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
    padding: spacing.s,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    gap: spacing.xs,
    marginBottom: spacing.s,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    height: 48,
  },
  resultItem: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultText: {
    ...typography.body,
    color: colors.text.primary,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.l,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  selectedMetroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.s,
    marginBottom: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedMetroText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
  nameInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    ...typography.body,
    color: colors.text.primary,
    marginBottom: spacing.s,
  },
  suggestionsLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  chipTextActive: {
    color: colors.white,
  },
  spacer: {
    flex: 1,
  },
  saveButton: {
    height: 48,
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.s,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  backLinkText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
