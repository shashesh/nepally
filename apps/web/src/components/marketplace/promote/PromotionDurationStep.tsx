import React, { useState } from 'react';
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
 *
 * The field keeps its own draft. Passing every change straight up would clamp
 * an emptied field back to 1 at once, so a member who deletes "7" to type "3"
 * would get "13". Only whole numbers reach `onDaysChange`; a field left empty
 * gets the last duration back on blur.
 */
export function PromotionDurationStep({ tier, days, onDaysChange, totalCents, endDate }: PromotionDurationStepProps) {
  const [draft, setDraft] = useState<number | string>(days);
  // Follow a duration changed from outside the field (react.dev: adjusting state when a prop changes).
  const [shownDays, setShownDays] = useState(days);
  if (days !== shownDays) {
    setShownDays(days);
    setDraft(days);
  }

  const handleChange = (value: number | string) => {
    setDraft(value);
    if (typeof value === 'number') onDaysChange(value);
  };

  return (
    <div className={styles.step}>
      <NumberInput
        label="Duration in days"
        value={draft}
        onChange={handleChange}
        onBlur={() => {
          if (typeof draft !== 'number') setDraft(days);
        }}
        min={MIN_PROMOTION_DAYS}
        max={MAX_PROMOTION_DAYS}
        clampBehavior="strict"
        allowDecimal={false}
        allowNegative={false}
        role="spinbutton"
        aria-valuemin={MIN_PROMOTION_DAYS}
        aria-valuemax={MAX_PROMOTION_DAYS}
        // From the draft, not `days`: an emptied field has no current value.
        aria-valuenow={typeof draft === 'number' ? draft : undefined}
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
