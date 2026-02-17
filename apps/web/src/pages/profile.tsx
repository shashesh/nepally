import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { TRUST_LEVELS } from '@nusa/shared';
import type { TrustLevel } from '@nusa/shared';
import styles from '../styles/Profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login');
    return null;
  }

  const trustConfig = TRUST_LEVELS[user.trust_level as TrustLevel];
  const trustClass =
    user.trust_level === 0
      ? styles.trustNew
      : user.trust_level === 1
        ? styles.trustVerified
        : styles.trustContributor;

  const trustLabel = trustConfig?.name || 'Unknown';

  async function handleSignOut() {
    await signOut();
    router.push('/');
  }

  return (
    <>
      <Head>
        <title>Profile - NUSA</title>
      </Head>
      <div className={styles.profilePage}>
        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar}>
              {user.full_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className={styles.profileName}>{user.full_name}</div>
              <div className={styles.profileEmail}>{user.email}</div>
              <span className={`${styles.trustBadge} ${trustClass}`}>
                {user.trust_level === 1 && '✓ '}
                {user.trust_level === 2 && '✓✓ '}
                Level {user.trust_level}: {trustLabel}
              </span>
            </div>
          </div>

          <div className={styles.infoSection}>
            <h2 className={styles.sectionTitle}>Account Info</h2>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Email</span>
              <span className={styles.infoValue}>{user.email}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Phone</span>
              <span className={styles.infoValue}>
                {user.phone || 'Not set'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>ZIP Code</span>
              <span className={styles.infoValue}>
                {user.zip_code || 'Not set'}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Member Since</span>
              <span className={styles.infoValue}>
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>

          <div className={styles.infoSection}>
            <h2 className={styles.sectionTitle}>Activity</h2>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Posts</span>
              <span className={styles.infoValue}>{user.posts_count || 0}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>Helpful Votes</span>
              <span className={styles.infoValue}>
                {user.helpful_votes_received || 0}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              onClick={handleSignOut}
              className={styles.signOutBtn}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
