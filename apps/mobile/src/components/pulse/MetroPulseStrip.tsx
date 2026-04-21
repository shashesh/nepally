import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getPulseCards, type PulseCard as PulseCardType } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { PulseCard } from './PulseCard';

interface Props {
  metroAreaId: string;
  metroLabel: string;
}

export function MetroPulseStrip({ metroAreaId, metroLabel }: Props) {
  const [cards, setCards] = useState<PulseCardType[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const navigation = useNavigation();

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getPulseCards(supabase, {
        metroAreaId,
        metroLabel,
        dismissedIds,
      });
      if (cancelled || !mountedRef.current) return;
      if (res.data) setCards(res.data.cards);
      else setCards([]);
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
          (navigation as unknown as { navigate: (r: string) => void }).navigate('Events');
          break;
        case 'metro_highlights':
        case 'fx_rate':
          break;
        case 'create_first_post':
          (navigation as unknown as { navigate: (r: string) => void }).navigate('CreatePost');
          break;
      }
    },
    [navigation]
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
    <View style={styles.wrapper} testID="metro-pulse-strip">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {cards.map((card) => (
          <PulseCard
            key={`${card.kind}:${card.id}`}
            card={card}
            onPress={handlePress}
            onDismiss={handleDismiss}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: 12 },
  content: { paddingHorizontal: 12 },
});
