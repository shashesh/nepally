import React, { type ReactNode } from 'react';
import styles from './legal.module.css';

/** A warning set apart from the policy text, such as "not a replacement for 911". */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div role="note" className={styles.callout}>
      {children}
    </div>
  );
}
