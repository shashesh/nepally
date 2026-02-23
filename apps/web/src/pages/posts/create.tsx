import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import {
  createPost,
  getTags,
  TAG_EMOJI,
  MAX_TAGS_PER_POST,
  MAX_PHOTOS_PER_POST,
} from '@nusa/shared';
import type { Tag } from '@nusa/shared';
import styles from '../../styles/CreatePost.module.css';

const TITLE_MAX = 150;
const TITLE_COUNTER_THRESHOLD = 120;
const BODY_MAX = 5000;
const BODY_COUNTER_THRESHOLD = 4500;

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation } = useLocation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isDirty = title.trim().length > 0 || body.trim().length > 0 || selectedTagIds.length > 0;
  const titleLength = title.trim().length;
  const bodyLength = body.trim().length;
  const titleValid = titleLength >= 5;
  const bodyValid = bodyLength >= 10;
  const tagsValid = selectedTagIds.length >= 1 && selectedTagIds.length <= MAX_TAGS_PER_POST;
  const canSubmit = titleValid && bodyValid && tagsValid && !submitting && !tagsLoading;

  const hasEmergencyTag = availableTags.some(
    (t) => t.slug === 'emergency' && selectedTagIds.includes(t.id)
  );
  const requiresModeration = availableTags.some(
    (t) => selectedTagIds.includes(t.id) && t.requires_moderation
  );

  const metroName = activeLocation
    ? `${activeLocation.metro_name}, ${activeLocation.metro_state}`
    : null;

  const postButtonHint = tagsLoading
    ? 'Loading tags...'
    : !titleValid
      ? 'Title must be at least 5 characters'
      : !bodyValid
        ? 'Body must be at least 10 characters'
        : !tagsValid
          ? 'Select at least 1 tag'
          : null;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.trust_level < 1) {
      router.replace('/feed');
    }
  }, [user, router]);

  useEffect(() => {
    setTagsLoading(true);
    setTagsError(null);
    getTags(supabase).then((result) => {
      if (result.data) {
        setAvailableTags(result.data);
      } else {
        setTagsError('Unable to load tags. Refresh the page and try again.');
      }
      setTagsLoading(false);
    });
  }, []);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      if (prev.length >= MAX_TAGS_PER_POST) return prev;
      return [...prev, tagId];
    });
  }

  function handleCancel() {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to discard this post?')) {
        return;
      }
    }
    router.back();
  }

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setError('');

    const metroAreaId = activeLocation?.metro_area_id ?? user.metro_area_id;
    if (!metroAreaId || !user.zip_code) {
      setError('Please complete onboarding with a valid ZIP code before posting.');
      return;
    }

    setSubmitting(true);
    try {
      const cityName = activeLocation?.metro_name?.split('-')[0]?.trim() || 'Unknown';
      const stateName = activeLocation?.metro_state || 'Unknown';

      const result = await createPost(supabase, {
        title: title.trim(),
        description: body.trim(),
        tag_ids: selectedTagIds,
        is_global: isGlobal,
        metroAreaId,
        locationZipCode: user.zip_code,
        locationCity: cityName,
        locationState: stateName,
        requiresModeration,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      router.push('/feed');
    } catch {
      setError('Could not create post. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || user.trust_level < 1) return null;

  return (
    <>
      <Head>
        <title>Create Post - NUSA</title>
      </Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <h2 className={styles.headerTitle}>Create Post</h2>
          <button
            className={`${styles.postBtn} ${!canSubmit ? styles.postBtnDisabled : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* Title */}
        <div className={styles.titleSection}>
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this about?"
            maxLength={TITLE_MAX}
            aria-label="Post title, required"
          />
          {title.length >= TITLE_COUNTER_THRESHOLD && (
            <span className={`${styles.charCounter} ${title.length >= 140 ? styles.charCounterError : ''}`}>
              {title.length}/{TITLE_MAX}
            </span>
          )}
          {!titleValid && title.length > 0 && (
            <div className={styles.inlineError}>Title must be at least 5 characters</div>
          )}
        </div>

        {/* Body */}
        <div className={styles.bodySection}>
          <textarea
            className={styles.bodyInput}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post details here..."
            maxLength={BODY_MAX}
            aria-label="Post body, required"
          />
          {body.length >= BODY_COUNTER_THRESHOLD && (
            <span className={`${styles.charCounter} ${body.length >= 4800 ? styles.charCounterError : ''}`}>
              {body.length}/{BODY_MAX}
            </span>
          )}
          {!bodyValid && body.length > 0 && (
            <div className={styles.inlineError}>Body must be at least 10 characters</div>
          )}
        </div>

        {/* Tags */}
        <div className={styles.section}>
          <div className={styles.sectionLabelRow}>
            <div className={styles.sectionLabel}>Tags (1-3 required)</div>
            <div className={styles.sectionHint}>{selectedTagIds.length}/{MAX_TAGS_PER_POST}</div>
          </div>
          {tagsError && <div className={styles.inlineError}>{tagsError}</div>}
          <div className={styles.tagGrid}>
            {availableTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              const emoji = TAG_EMOJI[tag.slug] || '';
              const isDisabled = !isSelected && selectedTagIds.length >= MAX_TAGS_PER_POST;

              return (
                <button
                  key={tag.id}
                  className={`${styles.tagChip} ${isSelected ? styles.tagChipSelected : ''} ${isDisabled ? styles.tagChipDisabled : ''}`}
                  onClick={() => toggleTag(tag.id)}
                  disabled={isDisabled}
                  aria-label={`${tag.name} tag, ${isSelected ? 'selected' : 'not selected'}`}
                >
                  {emoji ? `${emoji} ${tag.name}` : tag.name}
                </button>
              );
            })}
          </div>

          {!tagsValid && !tagsLoading && (
            <div className={styles.inlineError}>Please select at least 1 tag</div>
          )}

          {hasEmergencyTag && (
            <div className={styles.emergencyWarning}>
              Emergency posts require moderator approval before becoming visible. This is NOT a replacement for 911.
            </div>
          )}
        </div>

        {/* Photo Attachment */}
        <div className={styles.section}>
          <div className={styles.photoRow}>
            <span className={styles.photoIcon}>📷</span>
            <span className={styles.photoLabel}>Add Photos (optional)</span>
            <span className={styles.photoCount}>0/{MAX_PHOTOS_PER_POST}</span>
          </div>
          <div className={styles.sectionHint}>Photos are optional and not required to publish.</div>
        </div>

        {/* Location Info */}
        {metroName && (
          <div className={styles.locationRow}>
            📍 Posting to: {metroName}
          </div>
        )}

        {/* Global Toggle (Premium Only) */}
        {user.is_premium && (
          <div className={styles.globalRow}>
            <div>
              <div className={styles.globalLabel}>🌐 Post Globally</div>
              <div className={styles.globalSublabel}>Visible in all metro areas</div>
            </div>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                className={styles.toggleInput}
                aria-label="Post globally toggle"
              />
            </label>
          </div>
        )}

        {postButtonHint && <div className={styles.submitHint}>{postButtonHint}</div>}
      </div>
    </>
  );
}
