import React, { type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { AppShell, Center, Loader } from '@mantine/core';
import type { Notification } from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { useNotificationsFeed } from '../hooks/useNotificationsFeed';
import { useUnreadMessageCount } from '../hooks/useUnreadMessageCount';
import { BottomTabBar } from './layout/BottomTabBar';
import { isTaskRoute } from './layout/navItems';
import { PublicShell } from './layout/PublicShell';
import { SearchEntry } from './layout/SearchEntry';
import { SideRail } from './layout/SideRail';
import { TopBar } from './layout/TopBar';
import { getNotificationHref } from './notifications/notificationHref';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? null;
  const unreadMessages = useUnreadMessageCount(userId);
  const notifications = useNotificationsFeed({ userId, pollingEnabled: router.pathname !== '/notifications' });

  if (loading) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  if (!user) {
    return <PublicShell>{children}</PublicShell>;
  }

  const handleOpenNotification = async (notification: Notification) => {
    await notifications.markRead(notification);
    router.push(getNotificationHref(notification));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const showTabs = !isTaskRoute(router.pathname);

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: { sm: 72, md: 240 }, breakpoint: 'sm', collapsed: { mobile: true } }}
      padding={0}
    >
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>

      <AppShell.Header className={styles.header}>
        <TopBar
          user={user}
          unreadMessages={unreadMessages}
          notifications={notifications}
          onOpenNotification={(notification) => {
            void handleOpenNotification(notification);
          }}
          onSignOut={() => {
            void handleSignOut();
          }}
          search={<SearchEntry />}
        />
      </AppShell.Header>

      <AppShell.Navbar component="div" visibleFrom="sm" className={styles.navbar}>
        <SideRail user={user} />
      </AppShell.Navbar>

      <AppShell.Main id="main-content" className={styles.main}>
        <div className={showTabs ? `${styles.content} ${styles.withTabs}` : styles.content}>{children}</div>
      </AppShell.Main>

      {showTabs ? <BottomTabBar user={user} /> : null}
    </AppShell>
  );
}
