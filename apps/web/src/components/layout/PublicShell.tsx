import React, { type ReactNode } from 'react';
import Link from 'next/link';
import { Button, Group } from '@mantine/core';
import { FOOTER_LINKS } from './navItems';
import styles from './PublicShell.module.css';

/** Shell for signed-out visitors: brand, Log in / Sign up, legal footer. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandDot} aria-hidden="true" />
            Nepally
          </Link>
          <Group gap="xs">
            <Button variant="default" component={Link} href="/login">
              Log in
            </Button>
            <Button component={Link} href="/signup">
              Sign up
            </Button>
          </Group>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        {children}
      </main>

      <footer className={styles.footer}>
        <nav aria-label="Footer links" className={styles.footerNav}>
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.footerLink}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className={styles.copy}>&copy; {new Date().getFullYear()} Nepally Community</p>
      </footer>
    </div>
  );
}
