import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addDays,
  createPromotionCheckout,
  getListingById,
  getPromotionBlocker,
  MAX_PROMOTION_DAYS,
  MIN_PROMOTION_DAYS,
  DEFAULT_PROMOTION_DAYS,
  type MarketplaceListing,
  type PromotionBlocker,
  type PromotionTierConfig,
  type PromotionViewer,
} from '@nepally/shared';
import { supabase } from '../lib/supabase';
import { useNow } from './useNow';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const GENERIC_PAY_ERROR = 'Something went wrong. Please try again.';

export type WizardStep = 1 | 2 | 3;

export interface PromoteWizardState {
  listing: MarketplaceListing | null;
  loading: boolean;
  /** The read failed. Distinct from `notFound`, which means it succeeded and found nothing. */
  error: string | null;
  notFound: boolean;
  reload: () => void;
  /** Why this member can't promote this listing; null while loading or when they can. */
  blocker: PromotionBlocker | null;
  step: WizardStep;
  tier: PromotionTierConfig | null;
  setTier: (tier: PromotionTierConfig) => void;
  days: number;
  /** Clamped to MIN/MAX_PROMOTION_DAYS; anything that isn't a number becomes MIN. */
  setDays: (value: number | string) => void;
  totalCents: number;
  startDate: Date;
  endDate: Date;
  next: () => void;
  back: () => void;
  paying: boolean;
  payError: string | null;
  pay: () => Promise<void>;
}

function clampDays(value: number | string): number {
  const parsed = typeof value === 'number' ? value : parseInt(value, 10);
  if (!Number.isFinite(parsed)) return MIN_PROMOTION_DAYS;
  return Math.max(MIN_PROMOTION_DAYS, Math.min(MAX_PROMOTION_DAYS, Math.trunc(parsed)));
}

const leaveForCheckout = (url: string) => window.location.assign(url);

/**
 * The promote wizard: the listing it promotes, who may promote it, the three
 * steps' choices, and checkout.
 *
 * The listing is read with `getListingById` rather than `useListingDetail`,
 * which would count the owner's visit as a view. The page keys its view by
 * listing id, so this state starts fresh per listing.
 *
 * Checkout stays busy once it has a URL: clearing it while the browser is
 * still leaving for Stripe let a second click open a second checkout session
 * and a second pending promotion (PR 8b inventory 6). A ref, not state, guards
 * against two clicks landing in the same frame.
 *
 * Pay reads the listing again before checkout. The blocker is worked out when
 * the wizard opens, so a listing deactivated or deleted in another tab
 * meanwhile would reach checkout, where the edge function refuses it with a
 * bare error. Reading first hands the page back to its refusal screen instead,
 * with the reason.
 */
export function usePromoteWizard(
  listingId: string | undefined,
  viewer: PromotionViewer | null,
  redirect: (url: string) => void = leaveForCheckout
): PromoteWizardState {
  const now = useNow();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState<WizardStep>(1);
  const [tier, setTier] = useState<PromotionTierConfig | null>(null);
  const [days, setDaysState] = useState(DEFAULT_PROMOTION_DAYS);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const payingRef = useRef(false);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;

    void getListingById(supabase, listingId).then((result) => {
      if (cancelled) return;
      if (result.data) {
        setListing(result.data);
        setError(null);
        setNotFound(false);
      } else {
        setListing(null);
        setNotFound(Boolean(result.notFound));
        setError(result.notFound ? null : (result.error?.message ?? "Couldn't load this listing."));
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [listingId, attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    setAttempt((count) => count + 1);
  }, []);

  const setDays = useCallback((value: number | string) => setDaysState(clampDays(value)), []);

  const next = useCallback(() => {
    setStep((current) => {
      if (current === 1 && !tier) return current;
      return current < 3 ? ((current + 1) as WizardStep) : current;
    });
  }, [tier]);

  const back = useCallback(() => {
    setStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));
  }, []);

  const viewerId = viewer?.id ?? null;
  const viewerTrust = viewer?.trust_level ?? null;
  const blocker =
    listing && viewerId ? getPromotionBlocker(listing, { id: viewerId, trust_level: viewerTrust }) : null;

  const pay = useCallback(async () => {
    if (!tier || !listingId || payingRef.current) return;

    payingRef.current = true;
    setPaying(true);
    setPayError(null);
    let leaving = false;
    try {
      const fresh = await getListingById(supabase, listingId);
      if (fresh.notFound) {
        setListing(null);
        setNotFound(true);
        return;
      }
      if (!fresh.data) {
        setPayError("Couldn't check this listing. Please try again.");
        return;
      }
      setListing(fresh.data);
      if (viewerId && getPromotionBlocker(fresh.data, { id: viewerId, trust_level: viewerTrust })) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setPayError('Please sign in again to continue.');
        return;
      }

      const result = await createPromotionCheckout(
        SUPABASE_URL,
        session.access_token,
        SUPABASE_ANON_KEY,
        { listing_id: listingId, promotion_type: tier.type, duration_days: days },
        'web'
      );
      if (result.error) {
        setPayError(result.error.message);
        return;
      }
      const url = result.data?.checkoutUrl;
      if (!url) {
        setPayError(GENERIC_PAY_ERROR);
        return;
      }
      leaving = true;
      redirect(url);
    } catch {
      setPayError(GENERIC_PAY_ERROR);
    } finally {
      if (!leaving) {
        payingRef.current = false;
        setPaying(false);
      }
    }
  }, [tier, listingId, days, redirect, viewerId, viewerTrust]);

  return {
    listing,
    loading: Boolean(listingId) && loading,
    error,
    notFound,
    reload,
    blocker,
    step,
    tier,
    setTier,
    days,
    setDays,
    totalCents: tier ? tier.daily_cost_cents * days : 0,
    startDate: now,
    endDate: addDays(now, days),
    next,
    back,
    paying,
    payError,
    pay,
  };
}
