import React from 'react';
import { BUSINESS_HOURS_DAYS, type MarketplaceListing } from '@nepally/shared';
import styles from './ListingBusinessDetails.module.css';

export interface ListingBusinessDetailsProps {
  listing: MarketplaceListing;
}

interface Row {
  label: string;
  value: string;
}

function capitalise(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** A business listing's contact details and opening hours, as a definition list. */
export function ListingBusinessDetails({ listing }: ListingBusinessDetailsProps) {
  const rows: Row[] = [
    listing.business_name && { label: 'Business', value: listing.business_name },
    listing.address && { label: 'Address', value: listing.address },
    listing.phone && { label: 'Phone', value: listing.phone },
    listing.email && { label: 'Email', value: listing.email },
    listing.website_url && { label: 'Website', value: listing.website_url },
  ].filter(Boolean) as Row[];

  const hours = BUSINESS_HOURS_DAYS.map((day) => {
    const open = listing.business_hours?.[day];
    return open ? { label: capitalise(day), value: `${open.open} - ${open.close}` } : null;
  }).filter(Boolean) as Row[];

  if (rows.length === 0 && hours.length === 0) return null;

  return (
    <dl className={styles.list}>
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <dt className={styles.label}>{row.label}</dt>
          <dd className={styles.value}>{row.value}</dd>
        </div>
      ))}
      {hours.length > 0 && (
        <div className={styles.row}>
          <dt className={styles.label}>Hours</dt>
          <dd className={styles.value}>
            <ul className={styles.hours}>
              {hours.map((hour) => (
                <li key={hour.label} className={styles.hourRow}>
                  <span>{hour.label}</span>
                  <span>{hour.value}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      )}
    </dl>
  );
}
