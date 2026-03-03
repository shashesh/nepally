import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  getTotalUnreadCount,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@nusa/shared';
import type { Notification } from '@nusa/shared';
import LocationSwitcher from './LocationSwitcher';
import Avatar from './Avatar';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

function notifIcon(type: Notification['type']): string {
  switch (type) {
    case 'message': return '💬';
    case 'post_response': return '💬';
    case 'emergency_alert': return '🛡️';
    default: return '📩';
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  // Chat unread badge (messages icon)
  const [unreadCount, setUnreadCount] = useState(0);

  // Account dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notification bell dropdown
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifList, setNotifList] = useState<Notification[]>([]);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    const result = await getTotalUnreadCount(supabase, user.id);
    setUnreadCount(result.count);
  }, [user]);

  // Load chat unread count
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Supabase Realtime: unread chat count updates
  useEffect(() => {
    if (!user) return;

    const participantsChannel = supabase
      .channel(`chat-unread:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshUnreadCount();
        }
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`chat-messages-unread:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as { sender_id?: string };
          if (newMessage.sender_id === user.id) return;
          refreshUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, refreshUnreadCount]);

  // Resilience fallback: refresh unread chat badge on tab focus + interval
  // so badge stays correct even if realtime events are delayed/missed (reconnect/publication hiccups).
  useEffect(() => {
    if (!user) return;

    const onVisibilityChange = () => {
      if (!document.hidden) {
        refreshUnreadCount();
      }
    };

    const intervalId = window.setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, refreshUnreadCount]);

  // Load notification unread count + recent list
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const [countResult, listResult] = await Promise.all([
      getUnreadNotificationCount(supabase, user.id),
      getNotifications(supabase, user.id, 8, 0),
    ]);
    setUnreadNotifCount(countResult.count);
    if (listResult.data) setNotifList(listResult.data);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Supabase Realtime: new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          if (newNotif.type === 'message') return;
          setUnreadNotifCount((c) => c + 1);
          setNotifList((prev) => [newNotif, ...prev].slice(0, 8));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close notification dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    if (notifDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifDropdownOpen]);

  const handleNotifClick = async (notif: Notification) => {
    setNotifDropdownOpen(false);
    if (!notif.read) {
      await markNotificationRead(supabase, notif.id);
      setUnreadNotifCount((c) => Math.max(0, c - 1));
      setNotifList((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
    const data = notif.data as Record<string, string>;
    if (data.post_id) {
      router.push(`/posts/${data.post_id}`);
    } else {
      router.push('/notifications');
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(supabase, user.id);
    setUnreadNotifCount(0);
    setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const isActive = (path: string) =>
    router.pathname === path || router.pathname.startsWith(path + '/');

  const isHomeActive = router.pathname === '/' || isActive('/feed');

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push('/');
  };

  if (user) {
    return (
      <div className={styles.appShell}>
        <aside className={styles.leftRail}>
          <Link href="/" className={styles.logo}>
            NUSA
          </Link>

          <nav className={styles.sidebarNav}>
            <Link href="/" className={`${styles.sidebarLink} ${isHomeActive ? styles.sidebarLinkActive : ''}`}>
              Home
            </Link>
            <Link
              href="/events"
              className={`${styles.sidebarLink} ${isActive('/events') ? styles.sidebarLinkActive : ''}`}
            >
              Events
            </Link>
            <Link
              href="/marketplace"
              className={`${styles.sidebarLink} ${isActive('/marketplace') ? styles.sidebarLinkActive : ''}`}
            >
              Marketplace
            </Link>
          </nav>

          {user.trust_level >= 1 ? (
            <Link href="/posts/create" className={styles.sidebarPostBtn}>
              Post
            </Link>
          ) : (
            <Link href="/profile" className={styles.sidebarPostBtnMuted}>
              Verify to Post
            </Link>
          )}
        </aside>

        <div className={styles.contentShell}>
          <header className={styles.topBar}>
            <div className={styles.locationSection}>
              <span className={styles.locationLabel}>Browsing</span>
              <LocationSwitcher />
            </div>

            <div className={styles.navRight}>
              {/* Notification Bell */}
              <div className={styles.notifWrapper} ref={notifDropdownRef}>
                <button
                  className={styles.iconButton}
                  type="button"
                  aria-label={`Notifications${unreadNotifCount > 0 ? `, ${unreadNotifCount} unread` : ''}`}
                  aria-haspopup="true"
                  onClick={() => setNotifDropdownOpen((prev) => !prev)}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadNotifCount > 0 && (
                    <span className={styles.iconBadge}>
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className={styles.notifDropdown} aria-label="Notifications">
                    <div className={styles.notifDropdownHeader}>
                      <span className={styles.notifDropdownTitle}>Notifications</span>
                      {unreadNotifCount > 0 && (
                        <button className={styles.notifMarkAllBtn} onClick={handleMarkAllRead} type="button">
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {notifList.length === 0 ? (
                      <div className={styles.notifEmpty}>No notifications yet</div>
                    ) : (
                      <ul className={styles.notifList}>
                        {notifList.map((notif) => (
                          <li
                            key={notif.id}
                            className={[
                              styles.notifItem,
                              !notif.read ? styles.notifItemUnread : '',
                              notif.type === 'emergency_alert' ? styles.notifItemEmergency : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => handleNotifClick(notif)}
                          >
                            <span className={styles.notifItemIcon}>{notifIcon(notif.type)}</span>
                            <div className={styles.notifItemContent}>
                              <span className={styles.notifItemTitle}>{notif.title}</span>
                              <span className={styles.notifItemBody}>{notif.body}</span>
                              <span className={styles.notifItemTime}>{timeAgo(notif.sent_at)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className={styles.notifDropdownFooter}>
                      <Link href="/notifications" className={styles.notifSeeAll} onClick={() => setNotifDropdownOpen(false)}>
                        See all notifications →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Messages */}
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

              {/* Account dropdown */}
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
          </header>

          <main className={styles.main}>{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            NUSA
          </Link>
          <div className={styles.navAuth}>
            <Link href="/login" className={styles.btnSecondary}>
              Log In
            </Link>
            <Link href="/signup" className={styles.btnPrimary}>
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
