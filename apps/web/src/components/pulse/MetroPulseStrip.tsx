import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getPulseCards, type PulseCard as PulseCardType } from '@nepally/shared';
import { supabase } from '../../lib/supabase';
import { PulseCard } from './PulseCard';
import styles from './MetroPulseStrip.module.css';

interface Props {
  metroAreaId: string;
  metroLabel: string;
}

export function MetroPulseStrip({ metroAreaId, metroLabel }: Props) {
  const [cards, setCards] = useState<PulseCardType[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getPulseCards(supabase, {
        metroAreaId,
        metroLabel,
        dismissedIds,
      });
      if (cancelled) return;
      setCards(res.data?.cards ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [metroAreaId, metroLabel, dismissedIds]);

  const handlePress = useCallback(
    (card: PulseCardType) => {
      switch (card.kind) {
        case 'cultural_calendar':
        case 'events_this_week':
          router.push('/events');
          return;
        case 'create_first_post':
          router.push('/post/new');
          return;
        case 'metro_highlights':
        case 'fx_rate':
          return;
      }
    },
    [router]
  );

  const handleDismiss = useCallback((card: PulseCardType) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(card.id);
      return next;
    });
  }, []);

  if (cards.length === 0) return null;

  return (
    <section className={styles.wrapper} data-testid="metro-pulse-strip" aria-label="Metro pulse">
      <div className={styles.row}>
        {cards.map((card) => (
          <PulseCard
            key={`${card.kind}:${card.id}`}
            card={card}
            onPress={handlePress}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </section>
  );
}
