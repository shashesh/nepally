import React, { useState, FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { isValidZipCode, cleanZipCode, getMetroByZip, updateUserLocation, addSavedLocation } from '@nusa/shared';
import type { MetroArea } from '@nusa/shared';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { detectLocationMetro } from '../../lib/location';
import styles from '../../styles/Auth.module.css';

export default function ZipCodePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [zipCode, setZipCode] = useState('');
  const [metro, setMetro] = useState<MetroArea | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'zip' | 'confirm'>('zip');
  const [detecting, setDetecting] = useState(false);

  if (!user) {
    router.replace('/login');
    return null;
  }

  async function handleZipLookup(e: FormEvent) {
    e.preventDefault();
    setError('');

    const cleaned = cleanZipCode(zipCode);
    if (!isValidZipCode(cleaned)) {
      setError('Please enter a valid 5-digit ZIP code.');
      return;
    }

    setLoading(true);
    const result = await getMetroByZip(supabase, cleaned);
    setLoading(false);

    if (result.error) {
      setError('ZIP code not found. Please double-check and try again.');
    } else if (result.data) {
      setMetro(result.data);
      setStep('confirm');
    }
  }

  async function handleDetectLocation() {
    setDetecting(true);
    setError('');

    const result = await detectLocationMetro();
    setDetecting(false);

    if (result) {
      setMetro({
        id: result.metro_area_id,
        name: result.metro_name,
        state: result.metro_state,
        population: null,
      });
      setZipCode(result.zip_code);
      setStep('confirm');
    } else {
      setError("Couldn't detect your location. Please enter your ZIP code instead.");
    }
  }

  async function handleConfirm() {
    if (!metro || !user) return;

    setLoading(true);
    const result = await updateUserLocation(
      supabase,
      user.id,
      cleanZipCode(zipCode),
      metro.id
    );

    if (result.error) {
      setLoading(false);
      setError('Failed to save location. Please try again.');
    } else {
      // Create "Home" as the first saved location
      await addSavedLocation(supabase, user.id, metro.id, 'Home', cleanZipCode(zipCode), true);
      await refreshUser();
      setLoading(false);
      router.push('/feed');
    }
  }

  return (
    <>
      <Head>
        <title>Set Your Location - NUSA</title>
      </Head>
      <div className={styles.authPage}>
        <div className={styles.authCard}>
          {step === 'zip' && (
            <>
              <h1 className={styles.authTitle}>Where are you?</h1>
              <p className={styles.authSubtitle}>
                Enter your ZIP code so we can show you local community posts.
              </p>

              {error && <div className={styles.error}>{error}</div>}

              <form onSubmit={handleZipLookup} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="zip" className={styles.label}>
                    ZIP Code
                  </label>
                  <input
                    id="zip"
                    type="text"
                    inputMode="numeric"
                    className={styles.input}
                    value={zipCode}
                    onChange={(e) => setZipCode(cleanZipCode(e.target.value))}
                    placeholder="e.g. 10001"
                    maxLength={5}
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={loading || zipCode.length !== 5}
                >
                  {loading ? 'Looking up...' : 'Find My Area'}
                </button>
              </form>

              <div style={{ textAlign: 'center', margin: 'var(--space-s) 0' }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>or</span>
              </div>

              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleDetectLocation}
                disabled={detecting}
                style={{ background: 'transparent', color: 'var(--color-primary)', border: '2px solid var(--color-primary)' }}
              >
                {detecting ? 'Detecting...' : '📍 Detect My Location'}
              </button>
            </>
          )}

          {step === 'confirm' && metro && (
            <>
              <h1 className={styles.authTitle}>Confirm Your Area</h1>
              <p className={styles.authSubtitle}>
                We found your metro area:
              </p>

              <div
                style={{
                  textAlign: 'center',
                  padding: 'var(--space-m)',
                  margin: 'var(--space-s) 0',
                  background: '#F5F5F5',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <p style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  {metro.name}, {metro.state}
                </p>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => { setStep('zip'); setMetro(null); }}
                  className={styles.submitBtn}
                  style={{ background: 'transparent', color: 'var(--color-primary)', border: '2px solid var(--color-primary)' }}
                >
                  Change ZIP
                </button>
                <button
                  onClick={handleConfirm}
                  className={styles.submitBtn}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Saving...' : 'Confirm & Continue'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
