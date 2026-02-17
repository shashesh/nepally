import React, { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getTotalUnreadCount } from '@nusa/shared';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      getTotalUnreadCount(supabase, user.id).then((result) => {
        setUnreadCount(result.count);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const isActive = (path: string) =>
    router.pathname === path || router.pathname.startsWith(path + '/');

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            NUSA
          </Link>

          {user && (
            <ul className={styles.navLinks}>
              <li>
                <Link
                  href="/feed"
                  className={`${styles.navLink} ${isActive('/feed') ? styles.navLinkActive : ''}`}
                >
                  Feed
                </Link>
              </li>
              <li>
                <Link
                  href="/messages"
                  className={`${styles.navLink} ${isActive('/messages') ? styles.navLinkActive : ''}`}
                >
                  Messages
                  {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount}</span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  href="/profile"
                  className={`${styles.navLink} ${isActive('/profile') ? styles.navLinkActive : ''}`}
                >
                  Profile
                </Link>
              </li>
            </ul>
          )}

          <div className={styles.navAuth}>
            {user ? (
              <>
                <div className={styles.userInfo}>
                  <div className={styles.avatar}>
                    {user.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <span>{user.full_name}</span>
                </div>
                <button onClick={signOut} className={styles.signOutBtn}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.btnSecondary}>
                  Log In
                </Link>
                <Link href="/signup" className={styles.btnPrimary}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
