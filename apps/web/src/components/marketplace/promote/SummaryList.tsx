import React, { type ReactNode } from 'react';
import styles from './promoteSummary.module.css';

export interface SummaryListRow {
  label: string;
  value: ReactNode;
  /** The bottom line: set off by a rule and set bolder. */
  total?: boolean;
}

/**
 * A promotion's costs or details as a `<dl>`, so a screen reader pairs each
 * value with its label. Shared by the duration and review steps.
 */
export function SummaryList({ rows }: { rows: SummaryListRow[] }) {
  return (
    <dl className={styles.list}>
      {rows.map((row) => (
        <div key={row.label} className={styles.row} data-total={row.total || undefined}>
          <dt className={styles.label}>{row.label}</dt>
          <dd className={styles.value}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
