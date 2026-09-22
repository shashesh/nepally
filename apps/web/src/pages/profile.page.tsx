import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Stack, Tabs, UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { removeProfilePhoto, TrustLevel, updateUserProfile } from '@nepally/shared';
import type { MarketplaceListing } from '@nepally/shared';
import {
  ActionMenu,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  TrustBadge,
  notify,
  scrollFocusedTabIntoView,
  scrollingTabsClassNames,
  type ActionMenuItem,
} from '../components/ui';
import { AboutYouSection, type AboutYouValues } from '../components/profile/AboutYouSection';
import { AccountDetails } from '../components/profile/AccountDetails';
import { ProfilePhotoControl } from '../components/profile/ProfilePhotoControl';
import { PostSummaryRow } from '../components/posts/PostSummaryRow';
import { ListingSummaryRow } from '../components/marketplace/ListingSummaryRow';
import { getSettingsLinks } from '../components/layout/navItems';
import { useAuth } from '../hooks/useAuth';
import { useNow } from '../hooks/useNow';
import { useOwnProfileContent, type ListResource } from '../hooks/useOwnProfileContent';
import { useProfileEditing } from '../hooks/useProfileEditing';
import { replaceProfilePhoto } from '../lib/profilePhoto';
import { supabase } from '../lib/supabase';
import styles from '../styles/Profile.module.css';

type ProfileTab = 'posts' | 'listings' | 'saved' | 'about';

const TABS: { value: ProfileTab; label: string }[] = [
  { value: 'posts', label: 'Posts' },
  { value: 'listings', label: 'Listings' },
  { value: 'saved', label: 'Saved Posts' },
  { value: 'about', label: 'About' },
];

interface ListPanelProps<T> {
  list: ListResource<T>;
  loadingLabel: string;
  emptyTitle: string;
  emptyAction?: ReactNode;
  renderItem: (item: T) => ReactNode;
}

/** One tab's list: a skeleton while it loads, the error with a retry, an empty state, or the rows. */
function ListPanel<T>({ list, loadingLabel, emptyTitle, emptyAction, renderItem }: ListPanelProps<T>) {
  if (list.loading) return <LoadingState label={loadingLabel} />;
  if (list.error) return <ErrorState message={list.error} onRetry={list.reload} />;
  if (list.items.length === 0) return <EmptyState title={emptyTitle} action={emptyAction} />;
  return <Stack gap="xs">{list.items.map(renderItem)}</Stack>;
}

/**
 * The Listings tab's rows. Its own component so useNow's interval runs only
 * while the tab is open: `keepMounted={false}` unmounts inactive panels.
 */
function ListingsPanel({ list }: { list: ListResource<MarketplaceListing> }) {
  const now = useNow();
  return (
    <ListPanel
      list={list}
      loadingLabel="Loading listings…"
      emptyTitle="No marketplace listings yet."
      emptyAction={
        <Button component={Link} href="/marketplace/create">
          Post a listing
        </Button>
      }
      renderItem={(listing) => <ListingSummaryRow key={listing.id} listing={listing} owner={{ now }} />}
    />
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [aboutYou, setAboutYou] = useState<AboutYouValues>({
    hometown_district: user?.hometown_district ?? null,
    college: user?.college ?? null,
    years_in_us: user?.years_in_us ?? null,
    languages: user?.languages ?? [],
  });
  const [aboutYouSaving, setAboutYouSaving] = useState(false);
  const userId = user?.id ?? null;
  const { posts, saved, listings, unsave } = useOwnProfileContent(userId);
  const { editName, editBio, changePassword, saving } = useProfileEditing(user, refreshUser);

  // AuthContext starts as null while loading, so the initial useState above
  // captures empty values. Re-sync when the user profile actually loads (or
  // the signed-in user changes) so the About You form reflects the DB state.
  // Keyed on the user id so in-progress edits aren't clobbered by unrelated
  // user-object re-renders. Adjusted during render rather than in an effect.
  const [aboutYouUserId, setAboutYouUserId] = useState(userId);
  if (userId !== aboutYouUserId) {
    setAboutYouUserId(userId);
    if (user) {
      setAboutYou({
        hometown_district: user.hometown_district ?? null,
        college: user.college ?? null,
        years_in_us: user.years_in_us ?? null,
        languages: user.languages ?? [],
      });
    }
  }

  // False once the page unmounts, so a photo change that finishes after the
  // member has navigated away doesn't set state here. Its toast still shows:
  // it reports on the member's own photo, wherever they are now. Set true in
  // the effect body, not just its cleanup, so it's correct under StrictMode's
  // double mount too.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  // /posts/create sends members below Verified away, so only offer the link
  // to members who can use it. Listings need only a sign-in.
  const canPost = (user.trust_level ?? TrustLevel.NEW) >= TrustLevel.VERIFIED;

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
      router.push('/');
    } catch (error: unknown) {
      notify.error(error instanceof Error ? error.message : 'Failed to log out. Please try again.');
    }
  };

  /** Runs one photo change: busy while it and the follow-up refresh run, then a toast. */
  const changePhoto = async (run: () => Promise<string | null>, successMessage: string): Promise<void> => {
    setPhotoBusy(true);
    try {
      const error = await run();
      if (error) {
        notify.error(error);
        return;
      }
      await refreshUser();
      notify.success(successMessage);
    } finally {
      if (mounted.current) setPhotoBusy(false);
    }
  };

  const handlePhotoPick = (file: File): Promise<void> =>
    changePhoto(async () => (await replaceProfilePhoto(supabase, user.id, file)).error, 'Photo updated');

  const handlePhotoRemove = (): Promise<void> =>
    changePhoto(async () => {
      const { error } = await removeProfilePhoto(supabase, user.id);
      return error ? error.message || 'Failed to remove photo' : null;
    }, 'Photo removed');

  const handleSaveAboutYou = async (): Promise<void> => {
    setAboutYouSaving(true);
    const { error } = await updateUserProfile(supabase, user.id, {
      hometown_district: aboutYou.hometown_district,
      college: aboutYou.college,
      years_in_us: aboutYou.years_in_us,
      languages: aboutYou.languages,
    });
    if (error) {
      notify.error(error.message || 'Failed to save');
    } else {
      await refreshUser();
      notify.success('Saved');
    }
    setAboutYouSaving(false);
  };

  const handleUnsave = async (postId: string): Promise<void> => {
    const { error } = await unsave(postId);
    if (error) {
      notify.error('Failed to unsave post.');
    } else {
      notify.success('Post unsaved.');
    }
  };

  const menuItems: ActionMenuItem[] = [
    { key: 'edit-name', label: 'Edit Name', onClick: editName, disabled: saving },
    { key: 'edit-bio', label: 'Edit Bio', onClick: editBio, disabled: saving },
    { key: 'change-password', label: 'Change Password', onClick: changePassword, disabled: saving },
    { key: 'logout', label: 'Logout', onClick: handleSignOut, danger: true },
  ];

  return (
    <>
      <Head>
        <title>Profile - Nepally</title>
      </Head>
      <div className={styles.profilePage}>
        <PageHeader title="Profile" actions={<ActionMenu label="Open profile menu" items={menuItems} />} />

        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <ProfilePhotoControl
              name={user.full_name || '?'}
              photoUrl={user.profile_photo}
              busy={photoBusy}
              onPick={handlePhotoPick}
              onRemove={handlePhotoRemove}
            />
            <div>
              <div className={styles.profileName}>{user.full_name}</div>
              <div className={styles.profileEmail}>{user.email}</div>
              <TrustBadge level={user.trust_level} />
            </div>
          </div>

          <Tabs
            value={activeTab}
            onChange={(value) => {
              if (value) setActiveTab(value as ProfileTab);
            }}
            keepMounted={false}
            classNames={{ ...scrollingTabsClassNames, panel: styles.tabContent }}
          >
            <Tabs.List aria-label="Profile sections">
              {TABS.map(({ value, label }) => (
                <Tabs.Tab key={value} value={value} onFocus={scrollFocusedTabIntoView}>
                  {label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {/* tabIndex: with nothing focusable in a panel, Tab from the tab list would skip it. */}
            <Tabs.Panel value="posts" tabIndex={0}>
              <ListPanel
                list={posts}
                loadingLabel="Loading posts…"
                emptyTitle="You have not created any posts yet."
                emptyAction={
                  canPost ? (
                    <Button component={Link} href="/posts/create">
                      Start a post
                    </Button>
                  ) : undefined
                }
                renderItem={(post) => <PostSummaryRow key={post.id} post={post} />}
              />
            </Tabs.Panel>

            <Tabs.Panel value="listings" tabIndex={0}>
              <ListingsPanel list={listings} />
            </Tabs.Panel>

            <Tabs.Panel value="saved" tabIndex={0}>
              <ListPanel
                list={saved}
                loadingLabel="Loading saved posts…"
                emptyTitle="No saved posts yet."
                renderItem={(post) => (
                  <PostSummaryRow
                    key={post.id}
                    post={post}
                    menu={
                      <ActionMenu
                        label="Post options"
                        items={[{ key: 'unsave', label: 'Unsave Post', onClick: () => handleUnsave(post.id) }]}
                      />
                    }
                  />
                )}
              />
            </Tabs.Panel>

            <Tabs.Panel value="about" tabIndex={0}>
              <Stack gap="lg">
                <div>
                  <AboutYouSection values={aboutYou} onChange={setAboutYou} disabled={aboutYouSaving} />
                  <div className={styles.saveAboutRow}>
                    <Button onClick={handleSaveAboutYou} loading={aboutYouSaving} aria-label="Save About You">
                      Save About You
                    </Button>
                  </div>
                </div>
                <AccountDetails user={user} onEditBio={editBio} editBioBusy={saving} />
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </div>

        <nav aria-labelledby="settings-heading" className={styles.settingsCard}>
          <h2 id="settings-heading" className={styles.sectionTitle}>
            Settings &amp; more
          </h2>
          <ul className={styles.settingsList}>
            {getSettingsLinks(user).map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={styles.settingsLink}>
                  {link.label}
                  <IconChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li>
              <UnstyledButton className={`${styles.settingsLink} ${styles.settingsDanger}`} onClick={handleSignOut}>
                Sign out
              </UnstyledButton>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
