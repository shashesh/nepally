import React from 'react';
import {
  NEPAL_DISTRICTS,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  type LanguageCode,
} from '@nepally/shared';
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

export function AboutYouSection({ values, onChange, disabled }: Props) {
  const toggleLanguage = (code: LanguageCode) => {
    const set = new Set(values.languages);
    if (set.has(code)) set.delete(code);
    else set.add(code);
    onChange({ ...values, languages: Array.from(set) });
  };

  return (
    <section className={styles.section} aria-labelledby="about-you-title">
      <h3 id="about-you-title" className={styles.title}>About You</h3>
      <p className={styles.subtitle}>
        Optional. Helps people in your metro find others from home.
      </p>

      <label className={styles.label} htmlFor="about-district">
        Hometown district
      </label>
      <select
        id="about-district"
        className={styles.select}
        disabled={disabled}
        value={values.hometown_district ?? ''}
        onChange={(e) =>
          onChange({
            ...values,
            hometown_district: e.target.value === '' ? null : e.target.value,
          })
        }
      >
        <option value="">— Select —</option>
        {NEPAL_DISTRICTS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <label className={styles.label} htmlFor="about-college">
        College / university
      </label>
      <input
        id="about-college"
        className={styles.input}
        placeholder="e.g. Pulchowk Campus"
        value={values.college ?? ''}
        disabled={disabled}
        maxLength={100}
        onChange={(e) =>
          onChange({
            ...values,
            college: e.target.value.length === 0 ? null : e.target.value,
          })
        }
      />

      <label className={styles.label} htmlFor="about-years">Years in the US</label>
      <input
        id="about-years"
        className={styles.input}
        type="number"
        min={0}
        max={99}
        placeholder="5"
        disabled={disabled}
        value={values.years_in_us === null ? '' : values.years_in_us}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.length === 0) return onChange({ ...values, years_in_us: null });
          const n = parseInt(raw, 10);
          if (Number.isFinite(n) && n >= 0 && n <= 99) {
            onChange({ ...values, years_in_us: n });
          }
        }}
      />

      <label className={styles.label}>Languages you speak</label>
      <div className={styles.chipGrid} role="group" aria-label="Languages">
        {SUPPORTED_LANGUAGES.map((code) => {
          const selected = values.languages.includes(code);
          return (
            <button
              key={code}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              className={`${styles.chip} ${selected ? styles.chipSelected : ''}`}
              onClick={() => toggleLanguage(code)}
            >
              {LANGUAGE_LABELS[code]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
