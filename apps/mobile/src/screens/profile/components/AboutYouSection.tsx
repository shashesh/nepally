import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  NEPAL_DISTRICTS,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type LanguageCode,
} from '@nepally/shared';

export interface AboutYouValues {
  hometown_district: string | null;
  college: string | null;
  years_in_us: number | null;
  languages: string[];
}

interface Props {
  values: AboutYouValues;
  onChange: (next: AboutYouValues) => void;
  disabled?: boolean;
}

export function AboutYouSection({ values, onChange, disabled }: Props) {
  const toggleLanguage = (code: LanguageCode) => {
    const set = new Set(values.languages);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange({ ...values, languages: Array.from(set) });
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About You</Text>
      <Text style={styles.sectionSubtitle}>
        Optional. Helps people in your metro find others from home.
      </Text>

      <Text style={styles.label}>Hometown district</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {NEPAL_DISTRICTS.map((d) => {
          const selected = values.hometown_district === d;
          return (
            <TouchableOpacity
              key={d}
              disabled={disabled}
              onPress={() =>
                onChange({
                  ...values,
                  hometown_district: selected ? null : d,
                })
              }
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.label}>College / university</Text>
      <TextInput
        testID="about-college-input"
        style={styles.input}
        placeholder="e.g. Pulchowk Campus"
        value={values.college ?? ''}
        editable={!disabled}
        onChangeText={(t) => onChange({ ...values, college: t.length === 0 ? null : t })}
        maxLength={100}
      />

      <Text style={styles.label}>Years in the US</Text>
      <TextInput
        testID="about-years-input"
        style={styles.input}
        placeholder="5"
        keyboardType="number-pad"
        value={values.years_in_us === null ? '' : String(values.years_in_us)}
        editable={!disabled}
        onChangeText={(t) => {
          if (t.length === 0) return onChange({ ...values, years_in_us: null });
          const n = parseInt(t, 10);
          if (Number.isFinite(n) && n >= 0 && n <= 99) {
            onChange({ ...values, years_in_us: n });
          }
        }}
      />

      <Text style={styles.label}>Languages you speak</Text>
      <View style={styles.languageGrid}>
        {SUPPORTED_LANGUAGES.map((code) => {
          const selected = values.languages.includes(code);
          return (
            <TouchableOpacity
              key={code}
              disabled={disabled}
              onPress={() => toggleLanguage(code)}
              style={[styles.chip, selected && styles.chipSelected]}
              testID={`about-lang-${code}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {LANGUAGE_LABELS[code]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4, color: '#111' },
  sectionSubtitle: { fontSize: 13, color: '#666', marginBottom: 12 },
  label: { fontSize: 14, color: '#333', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  chipRow: { flexDirection: 'row' },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: '#c8102e', borderColor: '#c8102e' },
  chipText: { color: '#333', fontSize: 13 },
  chipTextSelected: { color: '#fff' },
});
