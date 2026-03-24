import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ActionIcon, Button, Center, Divider, Indicator, Loader, Menu, Text, UnstyledButton } from '@mantine/core';
import { useClickOutside } from '@mantine/hooks';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  getTotalUnreadCount,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  resolveNotificationRouteTarget,
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

  // Account dropdown (Mantine Menu handles open/close state)

  // Notification bell dropdown
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifList, setNotifList] = useState<Notification[]>([]);
  const notifDropdownRef = useClickOutside(() => setNotifDropdownOpen(false));

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

  // Resilience fallback: refresh bell count/list on tab focus + interval so
  // the icon stays accurate even if realtime notifications are delayed/missed.
  // Skip when on /notifications to avoid double-polling with that page's own
  // initial load and realtime subscription.
  useEffect(() => {
    if (!user || router.pathname === '/notifications') return;

    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadNotifications();
      }
    };

    const intervalId = window.setInterval(() => {
      loadNotifications();
    }, 30000);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user, loadNotifications, router.pathname]);

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
          setUnreadNotifCount((c) => c + 1);
          setNotifList((prev) => [newNotif, ...prev].slice(0, 8));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleNotifClick = async (notif: Notification) => {
    setNotifDropdownOpen(false);
    if (!notif.read) {
      await markNotificationRead(supabase, notif.id);
      setUnreadNotifCount((c) => Math.max(0, c - 1));
      setNotifList((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
    const target = resolveNotificationRouteTarget(notif);

    if (target.kind === 'post') {
      router.push(`/posts/${target.postId}`);
      return;
    }

    if (target.kind === 'event') {
      router.push(`/events/${target.eventId}`);
      return;
    }

    if (target.kind === 'message') {
      router.push(`/messages/${target.conversationId}`);
      return;
    }

    router.push('/notifications');
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(supabase, user.id);
    setUnreadNotifCount(0);
    setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDeleteNotif = async (event: React.MouseEvent, notif: Notification) => {
    event.stopPropagation();
    const result = await deleteNotification(supabase, notif.id);
    if (result.error) {
      console.error('Failed to delete notification:', result.error);
      return;
    }
    setNotifList((prev) => prev.filter((n) => n.id !== notif.id));
    if (!notif.read) {
      setUnreadNotifCount((c) => Math.max(0, c - 1));
    }
  };

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader color="nusaPrimary.6" />
      </Center>
    );
  }

  const isActive = (path: string) =>
    router.pathname === path || router.pathname.startsWith(path + '/');

  const isHomeActive = router.pathname === '/' || isActive('/feed');

  const handleSignOut = async () => {
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
                <Indicator
                  label={unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  size={18}
                  disabled={unreadNotifCount === 0}
                  color="red"
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    radius="xl"
                    aria-label={`Notifications${unreadNotifCount > 0 ? `, ${unreadNotifCount} unread` : ''}`}
                    aria-haspopup="true"
                    onClick={() => setNotifDropdownOpen((prev) => !prev)}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </ActionIcon>
                </Indicator>

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
                            <button
                              type="button"
                              className={styles.notifDismissBtn}
                              aria-label="Delete notification"
                              onClick={(event) => handleDeleteNotif(event, notif)}
                            >
                              ×
                            </button>
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
              <Indicator
                label={unreadCount > 99 ? '99+' : unreadCount}
                size={18}
                disabled={unreadCount === 0}
                color="red"
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  radius="xl"
                  component={Link}
                  href="/messages"
                  aria-label="Messages"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </ActionIcon>
              </Indicator>

              {/* Account dropdown */}
              <Menu
                shadow="md"
                width={260}
                position="bottom-end"
                offset={10}
                radius="lg"
              >
                <Menu.Target>
                  <UnstyledButton
                    className={styles.avatarButton}
                    aria-label="Open account menu"
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
                  </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                  <div className={styles.dropdownHeader}>
                    <Avatar
                      name={user.full_name || '?'}
                      photoUrl={user.profile_photo}
                      trustLevel={user.trust_level}
                      size="small"
                    />
                    <div className={styles.dropdownHeaderText}>
                      <Text size="sm" fw={700} className={styles.dropdownName}>{user.full_name}</Text>
                      <Text size="xs" c="dimmed" className={styles.dropdownEmail}>{user.email}</Text>
                    </div>
                  </div>

                  <Menu.Divider />

                  <Menu.Item
                    component={Link}
                    href="/profile"
                    leftSection={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    }
                  >
                    View Profile
                  </Menu.Item>
                  <Menu.Item
                    component={Link}
                    href="/profile/locations"
                    leftSection={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    }
                  >
                    Manage Locations
                  </Menu.Item>

                  <Menu.Divider />

                  <Menu.Item
                    color="red"
                    onClick={handleSignOut}
                    leftSection={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    }
                  >
                    Sign Out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
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
            <Button variant="outline" component={Link} href="/login" radius="xl">
              Log In
            </Button>
            <Button component={Link} href="/signup" radius="xl">
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
