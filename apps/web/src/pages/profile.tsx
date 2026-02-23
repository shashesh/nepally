import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  TRUST_LEVELS,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateUserProfile,
} from '@nusa/shared';
import type { TrustLevel } from '@nusa/shared';
import Avatar from '../components/Avatar';
import styles from '../styles/Profile.module.css';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

  async function processAndUpload(file: File) {
    setPhotoUploading(true);
    setPhotoStatus(null);

    try {
      // Resize image on a canvas
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d')!;

      // Center-crop: draw the largest square from the center of the image
      const srcSize = Math.min(bitmap.width, bitmap.height);
      const srcX = (bitmap.width - srcSize) / 2;
      const srcY = (bitmap.height - srcSize) / 2;
      ctx.drawImage(bitmap, srcX, srcY, srcSize, srcSize, 0, 0, 500, 500);

      // Convert to JPEG blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
          'image/jpeg',
          0.8
        );
      });

      // Convert blob to ArrayBuffer for the shared API
      const arrayBuffer = await blob.arrayBuffer();

      const { url, error: uploadError } = await uploadProfilePhoto(
        supabase,
        user!.id,
        arrayBuffer
      );
      if (uploadError) throw uploadError;

      const { error: profileError } = await updateUserProfile(supabase, user!.id, {
        profile_photo: url,
      });
      if (profileError) throw profileError;

      await refreshUser();
      setPhotoStatus({ type: 'success', message: 'Photo updated' });
    } catch (error: any) {
      setPhotoStatus({
        type: 'error',
        message: error.message || 'Failed to upload photo',
      });
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoUploading(true);
    setPhotoStatus(null);

    try {
      await deleteProfilePhoto(supabase, user!.id);
      const { error: profileError } = await updateUserProfile(supabase, user!.id, {
        profile_photo: undefined,
      });
      if (profileError) throw profileError;

      await refreshUser();
      setPhotoStatus({ type: 'success', message: 'Photo removed' });
    } catch (error: any) {
      setPhotoStatus({
        type: 'error',
        message: error.message || 'Failed to remove photo',
      });
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processAndUpload(file);
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  }

  return (
    <>
      <Head>
        <title>Profile - NUSA</title>
      </Head>
      <div className={styles.profilePage}>
        <div className={styles.profileCard}>
          <div className={styles.profileHeader}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                <Avatar
                  name={user.full_name || '?'}
                  photoUrl={user.profile_photo}
                  trustLevel={user.trust_level}
                  size="xlarge"
                />
                {photoUploading && <div className={styles.avatarOverlay}>...</div>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                aria-label="Upload profile photo"
                onChange={handleFileChange}
                className={styles.hiddenInput}
              />
              <div className={styles.photoActions}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  className={styles.photoBtn}
                >
                  {user.profile_photo ? 'Change Photo' : 'Add Photo'}
                </button>
                {user.profile_photo && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={photoUploading}
                    className={styles.photoBtnDanger}
                  >
                    Remove
                  </button>
                )}
              </div>
              {photoStatus && (
                <span
                  className={
                    photoStatus.type === 'success'
                      ? styles.photoSuccess
                      : styles.photoError
                  }
                >
                  {photoStatus.message}
                </span>
              )}
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
