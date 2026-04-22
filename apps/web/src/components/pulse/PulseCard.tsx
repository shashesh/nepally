import React from 'react';
import type { PulseCard as PulseCardType } from '@nepally/shared';
import styles from './PulseCard.module.css';

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
      return { headline: card.title, detail: `Starts ${formatRelativeDay(card.daysUntil)}` };
    case 'metro_highlights':
      return { headline: `${card.count} new in ${card.metroLabel}`, detail: 'in the last 24h' };
    case 'events_this_week':
      return { headline: `${card.count} events this week`, detail: `Next: ${card.nextEventTitle}` };
    case 'fx_rate':
      return { headline: formatFx(card), detail: 'USD · NPR' };
    case 'create_first_post':
      return { headline: card.title, detail: 'Click to create the first post today' };
    case 'find_your_people':
      return { headline: card.featured.displayName, detail: card.featured.reason };
    case 'top_helper':
      return { headline: card.helper.displayName, detail: `Top helper in ${card.metroLabel}` };
  }
}

export function PulseCard({ card, onPress, onDismiss }: Props) {
  const { headline, detail } = renderBody(card);
  return (
    <div className={styles.cardWrap}>
      <button
        type="button"
        data-testid={`pulse-card-dismiss-${card.id}`}
        className={styles.dismiss}
        aria-label="Dismiss card"
        onClick={() => onDismiss(card)}
      >
        ×
      </button>
      <button
        type="button"
        data-testid={`pulse-card-${card.id}`}
        className={styles.card}
        onClick={() => onPress(card)}
      >
        <p className={styles.headline}>{headline}</p>
        <p className={styles.detail}>{detail}</p>
      </button>
    </div>
  );
}
