import React, { type ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { LEGAL_LAST_UPDATED } from '@nepally/shared';
import styles from './legal.module.css';

interface LegalDocumentProps {
  title: string;
  description: string;
  intro: ReactNode;
  children: ReactNode;
}

const LEGAL_NAV: Array<{ href: string; label: string }> = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/guidelines', label: 'Community Guidelines' },
  { href: '/help', label: 'Help Center' },
];

function formatUpdated(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Shared shell for the public policy and help pages: page title, "last
 * updated" stamp, intro, body sections, and cross-links to the other pages.
 * Pages are public (no auth gate) so store reviewers can reach them.
 */
export default function LegalDocument({ title, description, intro, children }: LegalDocumentProps) {
  return (
    <>
      <Head>
        <title>{`${title} - Nepally`}</title>
        <meta name="description" content={description} />
      </Head>
      <article className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Nepally</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.updated}>Last updated {formatUpdated(LEGAL_LAST_UPDATED)}</p>
          <div className={styles.intro}>{intro}</div>
        </header>

        <div className={styles.body}>{children}</div>

        <nav className={styles.related} aria-label="Policies and help">
          {LEGAL_NAV.filter((item) => item.label !== title).map((item) => (
            <Link key={item.href} href={item.href} className={styles.relatedLink}>
              {item.label}
            </Link>
          ))}
        </nav>
      </article>
    </>
  );
}
