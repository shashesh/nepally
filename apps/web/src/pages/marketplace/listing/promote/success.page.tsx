import React, { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../../../hooks/useAuth';
import { supabase } from '../../../../lib/supabase';
import { getPromotionById, type ListingPromotion } from '@nepally/shared';
import styles from '../promote.module.css';

export default function PromoteSuccessPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { promotion_id: promotionId } = router.query;
  const mountedRef = useRef(true);

  const [promotion, setPromotion] = useState<ListingPromotion | null>(null);
  const [active, setActive] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

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
    if (!router.isReady || !promotionId || typeof promotionId !== 'string') return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15;

    const poll = async () => {
      while (!cancelled && attempts < maxAttempts) {
        attempts++;
        const result = await getPromotionById(supabase, promotionId);
        if (cancelled) return;

        if (result.data) {
          setPromotion(result.data);
          if (result.data.status === 'active') {
            setActive(true);
            return;
          }
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      if (!cancelled && mountedRef.current) {
        setTimedOut(true);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, promotionId, router]);

  if (!user) return null;

  return (
    <>
      <Head>
        <title>Promotion Confirmed — Nepally</title>
      </Head>
      <div className={styles.container}>
        <div className={styles.confirmationContent}>
          <div className={styles.successIcon}>
            {active ? '✅' : timedOut ? '⏳' : '⏳'}
          </div>
          <h1 className={styles.confirmationHeading}>
            {active
              ? 'Boost Active!'
              : timedOut
                ? 'Still Processing'
                : 'Processing Payment...'}
          </h1>
          <p className={styles.confirmationSubtext}>
            {active
              ? 'Your promotion is now live! Your listing will get increased visibility.'
              : timedOut
                ? 'Your payment is being confirmed. This may take a minute. Check back on your listing shortly.'
                : 'Your payment is being processed. This usually takes a few seconds.'}
          </p>

          {!active && !timedOut && (
            <div className={styles.loader}>Processing...</div>
          )}

          {(active || timedOut) && promotion && (
            <Link
              href={`/marketplace/listing/${promotion.listing_id}`}
              className={styles.viewListingLink}
            >
              View Listing
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
