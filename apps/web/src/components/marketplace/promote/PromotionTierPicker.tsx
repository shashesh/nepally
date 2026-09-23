import React, { useId } from 'react';
import { Radio, VisuallyHidden } from '@mantine/core';
import { IconCheck, IconPin, IconSpeakerphone, IconStar, type Icon } from '@tabler/icons-react';
import { formatCurrency, type PromotionTierConfig, type PromotionType } from '@nepally/shared';
import styles from './PromotionTierPicker.module.css';

export interface PromotionTierPickerProps {
  tiers: PromotionTierConfig[];
  value: PromotionType | null;
  onChange: (tier: PromotionTierConfig) => void;
}

const TIER_ICONS: Record<PromotionType, Icon> = {
  featured_listing: IconStar,
  sponsored_feed: IconSpeakerphone,
  sticky_business: IconPin,
};

/**
 * The promote wizard's first step: one radio card per tier.
 *
 * Mantine's `Radio.Card` gives each card `role="radio"`, `aria-checked` and
 * arrow-key movement inside a named `radiogroup`. Two things are added here:
 * a roving tab stop (only the checked card, or the first, is in the tab
 * order, as the APG radio pattern asks), and a short accessible name — the
 * card is a button, so without `aria-labelledby` its name would be every
 * line of text inside it. Price and description are its description instead.
 *
 * Each card's content is spans, not `p` / `ul`: a button may only hold
 * phrasing content.
 */
export function PromotionTierPicker({ tiers, value, onChange }: PromotionTierPickerProps) {
  const baseId = useId();
  const tabStop = value ?? tiers[0]?.type;

  const handleChange = (type: string) => {
    const tier = tiers.find((candidate) => candidate.type === type);
    if (tier) onChange(tier);
  };

  return (
    <Radio.Group label={<VisuallyHidden>Promotion type</VisuallyHidden>} value={value} onChange={handleChange}>
      <div className={styles.list}>
        {tiers.map((tier) => {
          const id = `${baseId}-${tier.type}`;
          const TierIcon = TIER_ICONS[tier.type];
          return (
            <Radio.Card
              key={tier.type}
              value={tier.type}
              className={styles.card}
              tabIndex={tier.type === tabStop ? 0 : -1}
              aria-labelledby={`${id}-name`}
              aria-describedby={`${id}-price ${id}-description`}
            >
              <span className={styles.header}>
                <Radio.Indicator />
                <span className={styles.icon} aria-hidden="true">
                  <TierIcon size={20} />
                </span>
                <span className={styles.heading}>
                  <span id={`${id}-name`} className={styles.name}>
                    {tier.name}
                  </span>
                  <span id={`${id}-price`} className={styles.price}>
                    {formatCurrency(tier.daily_cost_cents)}/day
                  </span>
                </span>
              </span>
              <span id={`${id}-description`} className={styles.description}>
                {tier.description}
              </span>
              <span className={styles.benefits}>
                {tier.benefits.map((benefit) => (
                  <span key={benefit} className={styles.benefit}>
                    <IconCheck size={14} aria-hidden="true" className={styles.benefitIcon} />
                    {benefit}
                  </span>
                ))}
              </span>
            </Radio.Card>
          );
        })}
      </div>
    </Radio.Group>
  );
}
