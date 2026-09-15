import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import type { User } from '@nepally/shared';
import { getTabLinks, isSectionActive } from './navItems';
import styles from './BottomTabBar.module.css';

/** Phone navigation (<48em). Layout hides it on task routes. */
export function BottomTabBar({ user }: { user: User }) {
  const router = useRouter();

  return (
    <nav aria-label="Tabs" className={styles.root}>
      <ul className={styles.list}>
        {getTabLinks(user).map((tab) => {
          const isCreate = tab.key === 'create';
          const active = !isCreate && isSectionActive(router.pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.key} className={styles.item}>
              <Link href={tab.href} className={isCreate ? styles.create : styles.tab} aria-current={active ? 'page' : undefined}>
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={isCreate ? 24 : 20} />
                </span>
                <span className={isCreate ? styles.visuallyHidden : styles.label}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
