import React, { useEffect, useRef, useState } from 'react';
import { Button, Loader, Stack, Tabs, UnstyledButton } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  extendedProfileUpdateSchema,
  getAboutYouFormValues,
  removeProfilePhoto,
  TrustLevel,
  updateUserProfile,
  userMessage,
} from '@nepally/shared';
import type { AboutYouFormValues } from '@nepally/shared';
import {
  ActionMenu,
  PageHeader,
  TrustBadge,
  notify,
  scrollFocusedTabIntoView,
  scrollingTabsClassNames,
  type ActionMenuItem,
} from '../components/ui';
import { AboutYouSection } from '../components/profile/AboutYouSection';
import { AccountDetails } from '../components/profile/AccountDetails';
import { ProfilePhotoControl } from '../components/profile/ProfilePhotoControl';
import { OwnListingsPanel, OwnPostsPanel, SavedPostsPanel } from '../components/profile/ProfileListPanels';
import { getSettingsLinks } from '../components/layout/navItems';
import { useAuth } from '../hooks/useAuth';
import { useFocusAfterUpdate } from '../hooks/useFocusAfterUpdate';
import { useOwnProfileContent } from '../hooks/useOwnProfileContent';
import { useProfileEditing } from '../hooks/useProfileEditing';
import { replaceProfilePhoto } from '../lib/profilePhoto';
import { supabase } from '../lib/supabase';
import styles from '../styles/Profile.module.css';

type ProfileTab = 'posts' | 'listings' | 'saved' | 'about';

const ABOUT_YOU_SAVE_FAILED = "Couldn't save About You. Please try again.";

const TABS: { value: ProfileTab; label: string }[] = [
  { value: 'posts', label: 'Posts' },
  { value: 'listings', label: 'Listings' },
  { value: 'saved', label: 'Saved Posts' },
  { value: 'about', label: 'About' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [photoBusy, setPhotoBusy] = useState(false);
  // Lazy initializer: getAboutYouFormValues only needs to run once, not on
  // every render. Every field of its Pick<User, …> parameter is optional, so
  // `user ?? {}` already yields the empty form values while user is null.
  const [aboutYou, setAboutYou] = useState<AboutYouFormValues>(() =>
    getAboutYouFormValues(user ?? {})
  );
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
      setAboutYou(getAboutYouFormValues(user));
    }
  }

  // Signing out never reaches this: Layout swaps in its loader while
  // AuthContext signs out, unmounting this page before the user clears. So
  // it only ever catches a visitor who arrives signed out.
  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [user, router]);

  // Unsaving hides the row at once, taking with it the menu trigger Mantine
  // would return focus to, so the browser drops focus to <body>. Move it to
  // the Saved panel instead, but only if it was lost: never steal it from
  // wherever the member has moved since (as ProfilePhotoControl does).
  const savedPanelRef = useRef<HTMLDivElement>(null);
  const armFocus = useFocusAfterUpdate(saved.items);

  if (!user) {
    return null;
  }

  // /posts/create sends members below Verified away, so only offer the link
  // to members who can use it. Listings need only a sign-in.
  const canPost = (user.trust_level ?? TrustLevel.NEW) >= TrustLevel.VERIFIED;

  const handleSignOut = async (): Promise<void> => {
    const { error } = await signOut();
    if (error) notify.error(error);
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
    } catch (error: unknown) {
      notify.error(
        userMessage(error, "Couldn't update your photo. Please try again.", 'profile_photo_change_failed', {
          platform: 'web',
          userId: user.id,
        })
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoPick = (file: File): Promise<void> =>
    changePhoto(async () => (await replaceProfilePhoto(supabase, user.id, file)).error, 'Photo updated');

  const handlePhotoRemove = (): Promise<void> =>
    changePhoto(async () => {
      const { error } = await removeProfilePhoto(supabase, user.id);
      return error
        ? userMessage(error, "Couldn't remove your photo. Please try again.", 'profile_photo_remove_failed', {
            platform: 'web',
            userId: user.id,
          })
        : null;
    }, 'Photo removed');

  const handleSaveAboutYou = async (): Promise<void> => {
    // Defence in depth: the Save button already drops its onClick while
    // aboutYouSaving is true, but a caller invoking this directly (or a
    // handler still attached mid-render) must not queue a second save.
    if (aboutYouSaving) return;
    const aboutYouContext = { platform: 'web', userId: user.id };
    setAboutYouSaving(true);
    try {
      // Validate and normalize before it ever reaches the network: trims
      // college, maps a blank college to null, and rejects a district that
      // isn't one of NEPAL_DISTRICTS. onChange deliberately does not trim,
      // so someone typing "Pulchowk Campus" doesn't have each space eaten
      // as they type it.
      const parsed = extendedProfileUpdateSchema.safeParse({
        hometown_district: aboutYou.hometown_district,
        college: aboutYou.college,
        years_in_us: aboutYou.years_in_us,
        languages: aboutYou.languages,
      });
      if (!parsed.success) {
        notify.error(parsed.error.issues[0]?.message ?? 'Failed to save');
        return;
      }
      const nextAboutYou: AboutYouFormValues = {
        hometown_district: parsed.data.hometown_district ?? null,
        college: parsed.data.college ?? null,
        years_in_us: parsed.data.years_in_us ?? null,
        languages: parsed.data.languages ?? [],
      };
      const { error } = await updateUserProfile(supabase, user.id, nextAboutYou);
      if (error) {
        notify.error(userMessage(error, ABOUT_YOU_SAVE_FAILED, 'profile_about_you_save_failed', aboutYouContext));
        return;
      }
      // The user object only re-seeds aboutYou when userId changes (see the
      // effect-on-render above), so without this the field would keep
      // showing the untrimmed text after a successful save.
      setAboutYou(nextAboutYou);
      await refreshUser();
      notify.success('Saved');
    } catch (error: unknown) {
      notify.error(userMessage(error, ABOUT_YOU_SAVE_FAILED, 'profile_about_you_save_failed', aboutYouContext));
    } finally {
      setAboutYouSaving(false);
    }
  };

  const handleUnsave = async (postId: string): Promise<void> => {
    // The row unmounts on the next render, and focus with it. preventScroll:
    // the panel is often taller than the viewport, and a plain focus() would
    // scroll its top into view, jumping the page.
    armFocus(() => savedPanelRef.current, { preventScroll: true });
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
    { key: 'logout', label: 'Log out', onClick: handleSignOut, danger: true },
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
            <div className={styles.profileIdentity}>
              <h2 className={styles.profileName}>{user.full_name}</h2>
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
              <OwnPostsPanel list={posts} canPost={canPost} />
            </Tabs.Panel>

            <Tabs.Panel value="listings" tabIndex={0}>
              <OwnListingsPanel list={listings} />
            </Tabs.Panel>

            <Tabs.Panel value="saved" tabIndex={0} ref={savedPanelRef}>
              <SavedPostsPanel list={saved} onUnsave={handleUnsave} />
            </Tabs.Panel>

            <Tabs.Panel value="about" tabIndex={0}>
              <Stack gap="lg">
                <div>
                  <AboutYouSection values={aboutYou} onChange={setAboutYou} disabled={aboutYouSaving} />
                  <div className={styles.saveAboutRow}>
                    {/* No `disabled`/`loading`: Mantine's `loading` sets native
                        `disabled`, which drops focus to <body> on Enter and
                        keeps it there. aria-disabled/data-disabled match
                        AccountDetails' bio button and ProfilePhotoControl.
                        The visible label stays "Save About You" — an
                        aria-label would be redundant while idle, and while
                        saving it would leave "Saving…" out of the accessible
                        name (WCAG 2.5.3 label-in-name), so the spinner
                        carries the progress cue instead. The "Saved" toast
                        (role="alert") announces completion. */}
                    <Button
                      onClick={aboutYouSaving ? undefined : handleSaveAboutYou}
                      aria-disabled={aboutYouSaving || undefined}
                      data-disabled={aboutYouSaving || undefined}
                      leftSection={aboutYouSaving ? <Loader size="xs" aria-hidden /> : undefined}
                    >
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
                Log out
              </UnstyledButton>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
