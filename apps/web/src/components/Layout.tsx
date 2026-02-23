import React, { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { getTotalUnreadCount } from '@nusa/shared';
import LocationSwitcher from './LocationSwitcher';
import Avatar from './Avatar';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      getTotalUnreadCount(supabase, user.id).then((result) => {
        setUnreadCount(result.count);
      });
    }
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const isActive = (path: string) =>
    router.pathname === path || router.pathname.startsWith(path + '/');

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <Link href="/" className={styles.logo}>
              NUSA
            </Link>
          </div>

          {user && (
            <div className={styles.navCenter}>
              <LocationSwitcher />
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
                    href="/events"
                    className={`${styles.navLink} ${isActive('/events') ? styles.navLinkActive : ''}`}
                  >
                    Events
                  </Link>
                </li>
                <li>
                  <Link
                    href="/marketplace"
                    className={`${styles.navLink} ${isActive('/marketplace') ? styles.navLinkActive : ''}`}
                  >
                    Marketplace
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <div className={styles.navAuth}>
            {user ? (
              <div className={styles.navRight}>
                {/* Bell icon — Coming Soon */}
                <div className={styles.tooltipWrapper}>
                  <button className={styles.iconButton} type="button" aria-label="Notifications">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </button>
                  <span className={styles.tooltip}>Coming Soon</span>
                </div>

                {/* Messages icon with badge */}
                <Link href="/messages" className={styles.iconButton} aria-label="Messages">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className={styles.iconBadge}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Avatar dropdown */}
                <div className={styles.dropdownWrapper} ref={dropdownRef}>
                  <button
                    className={styles.avatarButton}
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-label="Open account menu"
                    aria-haspopup="true"
                  >
                    <Avatar
                      name={user.full_name || '?'}
                      photoUrl={user.profile_photo}
                      trustLevel={user.trust_level}
                      size="small"
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownHeader}>
                        <Avatar
                          name={user.full_name || '?'}
                          photoUrl={user.profile_photo}
                          trustLevel={user.trust_level}
                          size="small"
                        />
                        <div className={styles.dropdownHeaderText}>
                          <span className={styles.dropdownName}>{user.full_name}</span>
                          <span className={styles.dropdownEmail}>{user.email}</span>
                        </div>
                      </div>
                      <hr className={styles.dropdownDivider} />
                      <Link
                        href="/profile"
                        className={styles.dropdownItem}
                        onClick={() => setDropdownOpen(false)}
                      >
                        View Profile
                      </Link>
                      <Link
                        href="/profile/locations"
                        className={styles.dropdownItem}
                        onClick={() => setDropdownOpen(false)}
                      >
                        Manage Locations
                      </Link>
                      <hr className={styles.dropdownDivider} />
                      <button
                        className={styles.dropdownItemDanger}
                        onClick={handleSignOut}
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
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
