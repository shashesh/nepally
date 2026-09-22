import React from 'react';
import { NativeSelect, NumberInput, Stack, TextInput } from '@mantine/core';
import {
  NEPAL_DISTRICTS,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type LanguageCode,
} from '@nepally/shared';
import { ToggleChipGroup, type ToggleChipOption } from '../ui/ToggleChipGroup';
import styles from './AboutYouSection.module.css';

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

const DISTRICT_OPTIONS = [
  { value: '', label: '— Select —' },
  ...NEPAL_DISTRICTS.map((district) => ({ value: district, label: district })),
];

const LANGUAGE_OPTIONS: ToggleChipOption[] = SUPPORTED_LANGUAGES.map((code: LanguageCode) => ({
  value: code,
  label: LANGUAGE_LABELS[code],
}));

export function AboutYouSection({ values, onChange, disabled }: Props) {
  return (
    <section className={styles.section} aria-labelledby="about-you-title">
      <h2 id="about-you-title" className={styles.title}>About You</h2>
      <p className={styles.subtitle}>
        Optional. Helps people in your metro find others from home.
      </p>

      <Stack gap="md">
        <NativeSelect
          label="Hometown district"
          data={DISTRICT_OPTIONS}
          disabled={disabled}
          value={values.hometown_district ?? ''}
          onChange={(event) =>
            onChange({
              ...values,
              hometown_district: event.currentTarget.value === '' ? null : event.currentTarget.value,
            })
          }
        />

        <TextInput
          label="College / university"
          placeholder="e.g. Pulchowk Campus"
          value={values.college ?? ''}
          disabled={disabled}
          maxLength={100}
          onChange={(event) =>
            onChange({
              ...values,
              college: event.currentTarget.value.length === 0 ? null : event.currentTarget.value,
            })
          }
        />

        <NumberInput
          label="Years in the US"
          placeholder="5"
          min={0}
          max={99}
          allowDecimal={false}
          allowNegative={false}
          clampBehavior="strict"
          disabled={disabled}
          value={values.years_in_us ?? ''}
          onChange={(value) => {
            if (value === '') {
              onChange({ ...values, years_in_us: null });
              return;
            }
            const years = typeof value === 'number' ? value : Number(value);
            if (Number.isNaN(years)) return;
            onChange({ ...values, years_in_us: years });
          }}
        />

        <ToggleChipGroup
          label="Languages you speak"
          mode="multiple"
          options={LANGUAGE_OPTIONS}
          value={values.languages}
          onChange={(next) => onChange({ ...values, languages: next })}
          disabled={disabled}
        />
      </Stack>
    </section>
  );
}
