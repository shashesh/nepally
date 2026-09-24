import React, { type ReactNode } from 'react';
import styles from './legal.module.css';

/** A group of questions under one heading. */
export function Faq({ children }: { children: ReactNode }) {
  return <div className={styles.faq}>{children}</div>;
}

interface FaqItemProps {
  question: string;
  children: ReactNode;
}

/**
 * One question and its answer. Native `<details>` / `<summary>` open with Enter
 * or Space and announce their state without any script.
 */
export function FaqItem({ question, children }: FaqItemProps) {
  return (
    <details className={styles.faqItem}>
      <summary className={styles.summary}>{question}</summary>
      <div className={styles.answer}>{children}</div>
    </details>
  );
}
