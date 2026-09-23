import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button, Loader } from '@mantine/core';
import { IconCircleCheck, IconHourglass } from '@tabler/icons-react';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '../../../../lib/supabase';
import { getPromotionById, type ListingPromotion } from '@nepally/shared';
import styles from '../promote.module.css';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 15;

export default function PromoteSuccessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const promotionId =
    typeof router.query.promotion_id === 'string' ? router.query.promotion_id : undefined;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;
  // The Pages Router keeps this page mounted from one promotion to the next,
  // so key the view by id. Without it a stale "View Listing" link would send
  // the member to the previous promotion's listing.
  return (
    <PromoteSuccessView
      key={promotionId ?? ''}
      promotionId={promotionId}
      ready={router.isReady}
    />
  );
}

interface PromoteSuccessViewProps {
  promotionId: string | undefined;
  ready: boolean;
}

function PromoteSuccessView({ promotionId, ready }: PromoteSuccessViewProps) {
  const mountedRef = useRef(true);

  const [promotion, setPromotion] = useState<ListingPromotion | null>(null);
  const [active, setActive] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  // Set when every attempt failed and the promotion was never read, so the
  // page can say so instead of sitting on "Still Processing" forever.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setTimedOut(false);
    setUnconfirmed(false);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !promotionId) return;

    let cancelled = false;
    let attempts = 0;
    let everRead = false;

    const poll = async () => {
      while (!cancelled && attempts < MAX_POLL_ATTEMPTS) {
        attempts++;
        const result = await getPromotionById(supabase, promotionId);
        if (cancelled) return;

        if (result.data) {
          everRead = true;
          setPromotion(result.data);
          if (result.data.status === 'active') {
            setActive(true);
            return;
          }
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }

      if (!cancelled && mountedRef.current) {
        setTimedOut(true);
        // Every read failed, so there is no listing to link to. Say so, and
        // offer a retry plus a route back to the member's own listings.
        if (!everRead) setUnconfirmed(true);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [ready, promotionId, attempt]);

  return (
    <>
      <Head>
        <title>Promotion Confirmed — Nepally</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.confirmationContent}>
          <div className={styles.successIcon} data-state={active ? 'active' : 'pending'} aria-hidden="true">
            {active ? <IconCircleCheck size={36} /> : <IconHourglass size={36} />}
          </div>
          <h1 className={styles.confirmationHeading}>
            {active
              ? 'Boost Active!'
              : unconfirmed
                ? "We couldn't confirm your promotion"
                : timedOut
                  ? 'Still Processing'
                  : 'Processing Payment...'}
          </h1>
          {unconfirmed ? (
            <p className={styles.confirmationSubtext} role="alert">
              We couldn&apos;t confirm your promotion just now. Your payment is safe — if it
              went through, the boost will appear on your listing shortly.
            </p>
          ) : (
            <p className={styles.confirmationSubtext}>
              {active
                ? 'Your promotion is now live! Your listing will get increased visibility.'
                : timedOut
                  ? 'Your payment is being confirmed. This may take a minute. Check back on your listing shortly.'
                  : 'Your payment is being processed. This usually takes a few seconds.'}
            </p>
          )}

          {!active && !timedOut && (
            <div className={styles.loader}>
              <Loader aria-label="Processing payment" />
            </div>
          )}

          <div className={styles.confirmationActions}>
            {unconfirmed && (
              <Button variant="default" onClick={retry}>
                Try again
              </Button>
            )}
            {(active || timedOut) && promotion && (
              <Button component={Link} href={`/marketplace/listing/${promotion.listing_id}`}>
                View Listing
              </Button>
            )}
            {unconfirmed && (
              <Button component={Link} href="/marketplace/my-listings">
                Go to My Listings
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
