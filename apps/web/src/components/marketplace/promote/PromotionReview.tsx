import React from 'react';
import { Alert, Button, Loader } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import {
  formatCurrency,
  formatDate,
  pluralize,
  type MarketplaceListing,
  type PromotionTierConfig,
} from '@nepally/shared';
import { SummaryList } from './SummaryList';
import styles from './promoteSummary.module.css';

export interface PromotionReviewProps {
  listing: Pick<MarketplaceListing, 'title' | 'price'>;
  tier: PromotionTierConfig;
  days: number;
  startDate: Date;
  endDate: Date;
  totalCents: number;
  paying: boolean;
  payError: string | null;
  onPay: () => void;
}

/** The wizard's last step: what is being bought, and the button that buys it. */
export function PromotionReview({
  listing,
  tier,
  days,
  startDate,
  endDate,
  totalCents,
  paying,
  payError,
  onPay,
}: PromotionReviewProps) {
  return (
    <div className={styles.step}>
      <div className={styles.preview}>
        <span className={styles.previewTitle}>{listing.title}</span>
        {listing.price ? <span className={styles.previewPrice}>{listing.price}</span> : null}
      </div>

      <SummaryList
        rows={[
          { label: 'Promotion', value: tier.name },
          { label: 'Duration', value: pluralize(days, 'day') },
          { label: 'Start date', value: formatDate(startDate) },
          { label: 'End date', value: formatDate(endDate) },
          { label: 'Total', value: formatCurrency(totalCents), total: true },
        ]}
      />

      {payError ? (
        <Alert role="alert" color="red" variant="light" icon={<IconAlertTriangle size={20} aria-hidden="true" />}>
          {payError}
        </Alert>
      ) : null}

      {/* Busy, it takes aria-disabled and data-disabled, never Mantine's
          `loading`, which sets native `disabled` and drops focus to <body>
          from the button the member just pressed. */}
      <Button
        size="md"
        fullWidth
        onClick={() => {
          if (!paying) onPay();
        }}
        aria-disabled={paying || undefined}
        data-disabled={paying || undefined}
        leftSection={paying ? <Loader size={16} /> : null}
      >
        {paying ? 'Processing…' : `Pay ${formatCurrency(totalCents)}`}
      </Button>
    </div>
  );
}
