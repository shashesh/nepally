import React, { type ReactElement, type ReactNode } from 'react';
import styles from './DetailList.module.css';

export interface DetailListProps {
  /** A hairline between rows. */
  divided?: boolean;
  children: ReactNode;
}

/** A `<dl>` of `DetailRow`s: each label on the left, its value on the right. */
export function DetailList({ divided = false, children }: DetailListProps): ReactElement {
  return <dl className={divided ? `${styles.list} ${styles.divided}` : styles.list}>{children}</dl>;
}

export interface DetailRowProps {
  label: ReactNode;
  children: ReactNode;
}

/** One label/value pair: `<div><dt/><dd/></div>`, so a row can be styled as one line. */
export function DetailRow({ label, children }: DetailRowProps): ReactElement {
  return (
    <div className={styles.row}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}
