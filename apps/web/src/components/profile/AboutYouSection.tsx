import React, { useId } from 'react';
import { NativeSelect, NumberInput, Stack, TextInput } from '@mantine/core';
import {
  COLLEGE_MAX_LENGTH,
  LANGUAGE_LABELS,
  NEPAL_DISTRICTS,
  SUPPORTED_LANGUAGES,
  YEARS_IN_US_MAX,
  YEARS_IN_US_MIN,
  type AboutYouFormValues,
  type LanguageCode,
} from '@nepally/shared';
import { ToggleChipGroup, type ToggleChipOption } from '../ui/ToggleChipGroup';
import styles from './AboutYouSection.module.css';

interface Props {
  values: AboutYouFormValues;
  onChange: (next: AboutYouFormValues) => void;
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
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const subtitleId = `${baseId}-subtitle`;

  return (
    <section className={styles.section} aria-labelledby={titleId} aria-describedby={subtitleId}>
      <h2 id={titleId} className={styles.title}>About You</h2>
      <p id={subtitleId} className={styles.subtitle}>
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
          maxLength={COLLEGE_MAX_LENGTH}
          onChange={(event) =>
            onChange({
              ...values,
              college: event.currentTarget.value.length === 0 ? null : event.currentTarget.value,
            })
          }
        />

        <NumberInput
          label="Years in the US"
          placeholder="e.g. 5"
          inputMode="numeric"
          min={YEARS_IN_US_MIN}
          max={YEARS_IN_US_MAX}
          allowDecimal={false}
          allowNegative={false}
          clampBehavior="strict"
          disabled={disabled}
          value={values.years_in_us ?? ''}
          onChange={(value) =>
            onChange({ ...values, years_in_us: value === '' ? null : Number(value) })
          }
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
