import React from 'react';
import { NumberInput } from '@mantine/core';
import {
  formatCurrency,
  formatDate,
  MAX_PROMOTION_DAYS,
  MIN_PROMOTION_DAYS,
  pluralize,
  type PromotionTierConfig,
} from '@nepally/shared';
import { SummaryList } from './SummaryList';
import styles from './promoteSummary.module.css';

export interface PromotionDurationStepProps {
  tier: PromotionTierConfig;
  days: number;
  onDaysChange: (value: number | string) => void;
  totalCents: number;
  endDate: Date;
}

/**
 * The wizard's second step. One NumberInput replaces the old −/input/+ trio:
 * its own controls step it by pointer, Arrow Up/Down by keyboard. Mantine
 * renders a plain textbox, so the spin-button role and value range are added
 * here for screen readers.
 */
export function PromotionDurationStep({ tier, days, onDaysChange, totalCents, endDate }: PromotionDurationStepProps) {
  return (
    <div className={styles.step}>
      <NumberInput
        label="Duration in days"
        value={days}
        onChange={onDaysChange}
        min={MIN_PROMOTION_DAYS}
        max={MAX_PROMOTION_DAYS}
        clampBehavior="strict"
        allowDecimal={false}
        allowNegative={false}
        role="spinbutton"
        aria-valuemin={MIN_PROMOTION_DAYS}
        aria-valuemax={MAX_PROMOTION_DAYS}
        aria-valuenow={days}
      />
      <SummaryList
        rows={[
          { label: 'Daily rate', value: formatCurrency(tier.daily_cost_cents) },
          { label: 'Duration', value: pluralize(days, 'day') },
          { label: 'Total cost', value: formatCurrency(totalCents), total: true },
          { label: 'Ends on', value: formatDate(endDate) },
        ]}
      />
    </div>
  );
}
