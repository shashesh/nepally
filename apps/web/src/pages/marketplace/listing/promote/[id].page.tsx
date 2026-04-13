import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '../../../../lib/supabase';
import {
  PROMOTION_TIERS,
  DEFAULT_PROMOTION_DAYS,
  MIN_PROMOTION_DAYS,
  MAX_PROMOTION_DAYS,
  formatCurrency,
  addDays,
  formatDate,
  createPromotionCheckout,
  getListingById,
  TrustLevel,
  type MarketplaceListing,
  type PromotionTierConfig,
} from '@nepally/shared';
import styles from '../promote.module.css';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type WizardStep = 1 | 2 | 3;

const STEP_LABELS = ['Type', 'Duration', 'Review & Pay'];

export default function PromoteListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { id: listingId } = router.query;
  const mountedRef = useRef(true);

  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTier, setSelectedTier] = useState<PromotionTierConfig | null>(null);
  const [durationDays, setDurationDays] = useState(DEFAULT_PROMOTION_DAYS);
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (!router.isReady || !listingId || typeof listingId !== 'string') return;

    let cancelled = false;
    (async () => {
      const result = await getListingById(supabase, listingId);
      if (cancelled) return;
      if (result.data) {
        setListing(result.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, listingId]);

  const totalCostCents = selectedTier
    ? selectedTier.daily_cost_cents * durationDays
    : 0;

  const projectedEndDate = addDays(new Date(), durationDays);
  const isLevel0 = (user?.trust_level ?? 0) < TrustLevel.VERIFIED;

  const handleDurationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = parseInt(e.target.value, 10);
      if (isNaN(num)) {
        setDurationDays(MIN_PROMOTION_DAYS);
      } else {
        setDurationDays(Math.max(MIN_PROMOTION_DAYS, Math.min(MAX_PROMOTION_DAYS, num)));
      }
    },
    []
  );

  const handleStepperPress = useCallback((delta: number) => {
    setDurationDays((prev) =>
      Math.max(MIN_PROMOTION_DAYS, Math.min(MAX_PROMOTION_DAYS, prev + delta))
    );
  }, []);

  const handlePay = useCallback(async () => {
    if (!selectedTier || !user || typeof listingId !== 'string') return;

    setPaymentLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Please sign in again to continue.');
        return;
      }

      const result = await createPromotionCheckout(
        SUPABASE_URL,
        session.access_token,
        SUPABASE_ANON_KEY,
        {
          listing_id: listingId,
          promotion_type: selectedTier.type,
          duration_days: durationDays,
        },
        'web'
      );

      if (result.error) {
        setError(result.error.message);
        return;
      }

      if (result.data?.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      }
    } catch {
      if (mountedRef.current) {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      if (mountedRef.current) {
        setPaymentLoading(false);
      }
    }
  }, [selectedTier, user, listingId, durationDays]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      router.back();
    } else {
      setStep((prev) => (prev - 1) as WizardStep);
    }
  }, [step, router]);

  const handleContinue = useCallback(() => {
    setStep((prev) => (prev + 1) as WizardStep);
  }, []);

  if (!user || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}>Loading...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className={styles.container}>
        <p>Listing not found.</p>
        <Link href="/marketplace">Back to Marketplace</Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Promote Listing — Nepally</title>
      </Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button type="button" className={styles.backLink} onClick={handleBack}>
            ← Back
          </button>
          <span className={styles.headerTitle}>Promote Listing</span>
          <span />
        </div>

        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          {STEP_LABELS.map((label, i) => {
            const stepNum = (i + 1) as WizardStep;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <div key={label} className={styles.stepDot}>
                <div
                  className={`${styles.dot} ${isActive ? styles.dotActive : ''} ${
                    isCompleted ? styles.dotCompleted : ''
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span
                  className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Step 1: Choose Tier */}
        {step === 1 && (
          <>
            <h2 className={styles.heading}>Choose Promotion Type</h2>
            <p className={styles.subheading}>Select how you want to boost your listing</p>

            {PROMOTION_TIERS.map((tier) => {
              const isSelected = selectedTier?.type === tier.type;
              return (
                <div
                  key={tier.type}
                  className={`${styles.tierCard} ${styles[`tierCard__${tier.type}`]} ${isSelected ? styles.tierCardSelected : ''}`}
                  onClick={() => setSelectedTier(tier)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedTier(tier);
                  }}
                >
                  <div className={styles.tierHeader}>
                    <div
                      className={`${styles.tierIcon} ${styles[`tierIcon__${tier.type}`]}`}
                    >
                      <span className={styles.tierIconSpan}>
                        {tier.type === 'featured_listing'
                          ? '⭐'
                          : tier.type === 'sponsored_feed'
                            ? '📢'
                            : '📌'}
                      </span>
                    </div>
                    <div className={styles.tierInfo}>
                      <div className={styles.tierName}>{tier.name}</div>
                      <div className={styles.tierPrice}>
                        {formatCurrency(tier.daily_cost_cents)}/day
                      </div>
                    </div>
                    {isSelected && (
                      <span className={styles.selectedCheck}>✓</span>
                    )}
                  </div>
                  <div className={styles.tierDescription}>{tier.description}</div>
                  <div className={styles.benefitsList}>
                    {tier.benefits.map((benefit) => (
                      <div key={benefit} className={`${styles.benefitRow} ${styles[`benefitRow__${tier.type}`]}`}>
                        <span className={styles.benefitCheck}>✓</span>
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <button
              className={styles.continueButton}
              onClick={handleContinue}
              disabled={!selectedTier}
            >
              Continue
            </button>
          </>
        )}

        {/* Step 2: Duration */}
        {step === 2 && (
          <>
            <h2 className={styles.heading}>Set Duration</h2>
            <p className={styles.subheading}>How long should your promotion run?</p>

            <div className={styles.durationRow}>
              <button
                className={styles.stepperButton}
                onClick={() => handleStepperPress(-1)}
                disabled={durationDays <= MIN_PROMOTION_DAYS}
                aria-label="Decrease duration"
              >
                −
              </button>

              <input
                className={styles.durationInput}
                type="number"
                value={durationDays}
                onChange={handleDurationChange}
                min={MIN_PROMOTION_DAYS}
                max={MAX_PROMOTION_DAYS}
                aria-label="Promotion duration in days"
              />

              <button
                className={styles.stepperButton}
                onClick={() => handleStepperPress(1)}
                disabled={durationDays >= MAX_PROMOTION_DAYS}
                aria-label="Increase duration"
              >
                +
              </button>
            </div>

            <div className={styles.durationLabel}>
              day{durationDays !== 1 ? 's' : ''}
            </div>

            <div className={styles.costSummary}>
              <div className={styles.costRow}>
                <span className={styles.costLabel}>Daily rate</span>
                <span className={styles.costValue}>
                  {selectedTier ? formatCurrency(selectedTier.daily_cost_cents) : '—'}
                </span>
              </div>
              <div className={styles.costRow}>
                <span className={styles.costLabel}>Duration</span>
                <span className={styles.costValue}>
                  {durationDays} day{durationDays !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={styles.divider} />
              <div className={styles.costRow}>
                <span className={styles.totalLabel}>Total Cost</span>
                <span className={styles.totalValue}>{formatCurrency(totalCostCents)}</span>
              </div>
              <div className={styles.costRow}>
                <span className={styles.costLabel}>Ends on</span>
                <span className={styles.costValue}>{formatDate(projectedEndDate)}</span>
              </div>
            </div>

            <button className={styles.continueButton} onClick={handleContinue}>
              Continue
            </button>
          </>
        )}

        {/* Step 3: Review & Pay */}
        {step === 3 && (
          <>
            <h2 className={styles.heading}>Review & Pay</h2>

            <div className={styles.listingPreview}>
              <div className={styles.previewTitle}>{listing.title}</div>
              {listing.price && <div className={styles.previewPrice}>{listing.price}</div>}
            </div>

            <div className={styles.reviewCard}>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Promotion</span>
                <span className={styles.reviewValue}>{selectedTier?.name}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Duration</span>
                <span className={styles.reviewValue}>
                  {durationDays} day{durationDays !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>Start date</span>
                <span className={styles.reviewValue}>{formatDate(new Date())}</span>
              </div>
              <div className={styles.reviewRow}>
                <span className={styles.reviewLabel}>End date</span>
                <span className={styles.reviewValue}>{formatDate(projectedEndDate)}</span>
              </div>
              <div className={styles.divider} />
              <div className={styles.reviewRow}>
                <span className={styles.totalLabel}>Total</span>
                <span className={styles.totalValue}>{formatCurrency(totalCostCents)}</span>
              </div>
            </div>

            {error && (
              <div className={styles.verifyBannerError}>
                {error}
              </div>
            )}

            {isLevel0 ? (
              <div className={styles.verifyBanner}>
                🛡️ Verify your account to promote listings. Only Level 1+ users can create
                promotions.
              </div>
            ) : (
              <button
                className={styles.payButton}
                onClick={handlePay}
                disabled={paymentLoading}
              >
                {paymentLoading ? 'Processing...' : `Pay ${formatCurrency(totalCostCents)}`}
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
