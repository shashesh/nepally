import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PulseCard as PulseCardType } from '@nepally/shared';

interface Props {
  card: PulseCardType;
  onPress: (card: PulseCardType) => void;
  onDismiss: (card: PulseCardType) => void;
}

function formatFx(card: Extract<PulseCardType, { kind: 'fx_rate' }>): string {
  return `1 USD = ${card.rate.toFixed(2)} NPR`;
}

function formatRelativeDay(daysUntil: number): string {
  if (daysUntil === 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return `in ${daysUntil} days`;
}

function renderBody(card: PulseCardType): { headline: string; detail: string } {
  switch (card.kind) {
    case 'cultural_calendar':
      return {
        headline: card.title,
        detail: `Starts ${formatRelativeDay(card.daysUntil)}`,
      };
    case 'metro_highlights':
      return {
        headline: `${card.count} new in ${card.metroLabel}`,
        detail: 'in the last 24h',
      };
    case 'events_this_week':
      return {
        headline: `${card.count} events this week`,
        detail: `Next: ${card.nextEventTitle}`,
      };
    case 'fx_rate':
      return {
        headline: formatFx(card),
        detail: 'USD · NPR',
      };
    case 'create_first_post':
      return {
        headline: card.title,
        detail: 'Tap to create the first post today',
      };
  }
}

export function PulseCard({ card, onPress, onDismiss }: Props) {
  const { headline, detail } = renderBody(card);

  return (
    <TouchableOpacity
      testID={`pulse-card-${card.id}`}
      style={styles.card}
      onPress={() => onPress(card)}
      activeOpacity={0.85}
    >
      <TouchableOpacity
        testID={`pulse-card-dismiss-${card.id}`}
        style={styles.dismiss}
        onPress={() => onDismiss(card)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.dismissText}>×</Text>
      </TouchableOpacity>
      <Text style={styles.headline} numberOfLines={2}>
        {headline}
      </Text>
      <Text style={styles.detail} numberOfLines={1}>
        {detail}
      </Text>
    </TouchableOpacity>
  );
}

const CARD_WIDTH = 240;
const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'flex-end',
    minHeight: 96,
  },
  dismiss: {
    position: 'absolute',
    top: 4,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dismissText: { fontSize: 18, color: '#999', lineHeight: 18 },
  headline: { fontSize: 15, fontWeight: '600', color: '#111' },
  detail: { marginTop: 4, fontSize: 12, color: '#666' },
});
