import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import {
  createPost,
  deletePostPhotos,
  getTags,
  TAG_EMOJI,
  MAX_TAGS_PER_POST,
  MAX_PHOTOS_PER_POST,
  MAX_POST_PHOTO_BYTES,
  uploadPostPhotos,
  validatePostPhotoFile,
} from '@nusa/shared';
import type { Tag } from '@nusa/shared';
import styles from '../../styles/CreatePost.module.css';

const TITLE_MAX = 150;
const TITLE_COUNTER_THRESHOLD = 120;
const BODY_MAX = 5000;
const BODY_COUNTER_THRESHOLD = 4500;

type SelectedPhoto = {
  id: string;
  file: File;
  preview_url: string;
};

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation } = useLocation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [error, setError] = useState('');

  const isDirty =
    title.trim().length > 0 ||
    body.trim().length > 0 ||
    selectedTagIds.length > 0 ||
    selectedPhotos.length > 0;
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
    clearSelectedPhotos();
    router.back();
  }

  function handlePhotoInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) return;

    if (selectedPhotos.length + files.length > MAX_PHOTOS_PER_POST) {
      setError(`You can upload up to ${MAX_PHOTOS_PER_POST} photos per post.`);
      return;
    }

    const nextPhotos: SelectedPhoto[] = [];
    for (const file of files) {
      const validation = validatePostPhotoFile({
        mime_type: file.type,
        size_bytes: file.size,
      });
      if (validation.error) {
        setError(validation.error.message);
        return;
      }

      nextPhotos.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview_url: URL.createObjectURL(file),
      });
    }

    setError('');
    setSelectedPhotos((prev) => [...prev, ...nextPhotos]);
  }

  function removeSelectedPhoto(photoId: string) {
    setSelectedPhotos((prev) => {
      const target = prev.find((item) => item.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.preview_url);
      }
      return prev.filter((item) => item.id !== photoId);
    });
  }
  function clearSelectedPhotos() {
    selectedPhotos.forEach((photo) => {
      URL.revokeObjectURL(photo.preview_url);
    });
    setSelectedPhotos([]);
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
    let uploadedPhotoPaths: string[] = [];
    try {
      const cityName = activeLocation?.metro_name?.split('-')[0]?.trim() || 'Unknown';
      const stateName = activeLocation?.metro_state || 'Unknown';

      let photoUrls: string[] = [];
      if (selectedPhotos.length > 0) {
        const uploadInputs = await Promise.all(
          selectedPhotos.map(async (photo) => ({
            user_id: user.id,
            file_data: await photo.file.arrayBuffer(),
            mime_type: photo.file.type || 'image/jpeg',
            size_bytes: photo.file.size,
            file_name: photo.file.name,
          }))
        );

        const uploadResult = await uploadPostPhotos(supabase, uploadInputs);
        if (uploadResult.error || !uploadResult.urls) {
          setError(uploadResult.error?.message || 'Failed to upload photos');
          return;
        }

        photoUrls = uploadResult.urls;
        uploadedPhotoPaths = uploadResult.paths || [];
      }

      const result = await createPost(supabase, {
        title: title.trim(),
        description: body.trim(),
        tag_ids: selectedTagIds,
        photos: photoUrls,
        is_global: isGlobal,
        metroAreaId,
        locationZipCode: user.zip_code,
        locationCity: cityName,
        locationState: stateName,
        requiresModeration,
      });

      if (result.error) {
        if (uploadedPhotoPaths.length > 0) {
          await deletePostPhotos(supabase, uploadedPhotoPaths);
        }
        setError(result.error.message);
        return;
      }

      clearSelectedPhotos();
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
          <label className={styles.photoRowButton}>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              className={styles.hiddenFileInput}
              onChange={handlePhotoInputChange}
              disabled={selectedPhotos.length >= MAX_PHOTOS_PER_POST || submitting}
            />
            <span className={styles.photoRow}>
              <span className={styles.photoIcon}>📷</span>
              <span className={styles.photoLabel}>Add Photos (optional)</span>
              <span className={styles.photoCount}>{selectedPhotos.length}/{MAX_PHOTOS_PER_POST}</span>
            </span>
          </label>
          <div className={styles.sectionHint}>Photos are optional and not required to publish.</div>
          <div className={styles.sectionHint}>Allowed: JPG, PNG, WEBP up to {Math.round(MAX_POST_PHOTO_BYTES / (1024 * 1024))}MB each.</div>

          {selectedPhotos.length > 0 && (
            <div className={styles.photoPreviewRow}>
              {selectedPhotos.map((photo, index) => (
                <div key={photo.id} className={styles.photoPreviewItem}>
                  <img src={photo.preview_url} alt={`Selected photo ${index + 1}`} className={styles.photoPreviewImage} />
                  <button
                    type="button"
                    className={styles.photoRemoveBtn}
                    onClick={() => removeSelectedPhoto(photo.id)}
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
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
