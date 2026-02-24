import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import {
  createPost,
  getPostById,
  updatePost,
  deletePostPhotos,
  getPostPhotoPathFromUrl,
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

type EditablePhoto =
  | { kind: 'existing'; existing_url: string }
  | { kind: 'new'; photo: SelectedPhoto };

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation } = useLocation();
  const editQueryParam = router.query.edit;
  const editPostId = typeof editQueryParam === 'string' ? editQueryParam : null;
  const isEditing = Boolean(editPostId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [removedExistingPhotoPaths, setRemovedExistingPhotoPaths] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [loadingExistingPost, setLoadingExistingPost] = useState(false);
  const [initialForm, setInitialForm] = useState<{
    title: string;
    body: string;
    selectedTagIds: string[];
    isGlobal: boolean;
    existingPhotos: string[];
  }>({
    title: '',
    body: '',
    selectedTagIds: [],
    isGlobal: false,
    existingPhotos: [],
  });

  const initialTagSet = new Set(initialForm.selectedTagIds);
  const currentTagSet = new Set(selectedTagIds);
  const tagsChanged =
    initialForm.selectedTagIds.length !== selectedTagIds.length ||
    selectedTagIds.some((id) => !initialTagSet.has(id)) ||
    initialForm.selectedTagIds.some((id) => !currentTagSet.has(id));
  const existingPhotosChanged =
    initialForm.existingPhotos.length !== existingPhotos.length ||
    initialForm.existingPhotos.some((url, index) => existingPhotos[index] !== url);
  const isDirty =
    title.trim() !== initialForm.title.trim() ||
    body.trim() !== initialForm.body.trim() ||
    tagsChanged ||
    isGlobal !== initialForm.isGlobal ||
    existingPhotosChanged ||
    selectedPhotos.length > 0;
  const titleLength = title.trim().length;
  const bodyLength = body.trim().length;
  const titleValid = titleLength >= 5;
  const bodyValid = bodyLength >= 10;
  const tagsValid = selectedTagIds.length >= 1 && selectedTagIds.length <= MAX_TAGS_PER_POST;
  const canSubmit =
    titleValid &&
    bodyValid &&
    tagsValid &&
    !submitting &&
    !tagsLoading &&
    !loadingExistingPost;

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
    : loadingExistingPost
      ? 'Loading post...'
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

  useEffect(() => {
    if (!isEditing || !editPostId || !user || availableTags.length === 0) return;

    setLoadingExistingPost(true);
    getPostById(supabase, editPostId)
      .then((result) => {
        if (!result.data) {
          setError(result.error?.message || 'Unable to load post for editing.');
          return;
        }

        if (result.data.author_id !== user.id) {
          setError('You can only edit your own posts.');
          return;
        }

        const existingTagIds = (result.data.tags || []).map((tag) => tag.id);
        setTitle(result.data.title || '');
        setBody(result.data.description || '');
        setSelectedTagIds(existingTagIds);
        setIsGlobal(Boolean(result.data.is_global));
        setExistingPhotos(result.data.photos || []);
        setRemovedExistingPhotoPaths([]);
        setInitialForm({
          title: result.data.title || '',
          body: result.data.description || '',
          selectedTagIds: existingTagIds,
          isGlobal: Boolean(result.data.is_global),
          existingPhotos: result.data.photos || [],
        });
      })
      .finally(() => {
        setLoadingExistingPost(false);
      });
  }, [isEditing, editPostId, user, availableTags.length]);

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
    if (isEditing && editPostId) {
      router.push(`/posts/${editPostId}`);
      return;
    }
    router.push('/feed');
  }

  function handlePhotoInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (files.length === 0) return;

    if (existingPhotos.length + selectedPhotos.length + files.length > MAX_PHOTOS_PER_POST) {
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

  function removeExistingPhoto(photoUrl: string) {
    setExistingPhotos((prev) => prev.filter((url) => url !== photoUrl));
    const path = getPostPhotoPathFromUrl(photoUrl);
    if (path) {
      setRemovedExistingPhotoPaths((prev) => {
        if (prev.includes(path)) return prev;
        return [...prev, path];
      });
    }
  }

  function getCombinedEditablePhotos(): EditablePhoto[] {
    return [
      ...existingPhotos.map((url) => ({ kind: 'existing' as const, existing_url: url })),
      ...selectedPhotos.map((photo) => ({ kind: 'new' as const, photo })),
    ];
  }

  function applyCombinedEditablePhotos(photos: EditablePhoto[]) {
    setExistingPhotos(
      photos
        .filter((item): item is { kind: 'existing'; existing_url: string } => item.kind === 'existing')
        .map((item) => item.existing_url)
    );
    setSelectedPhotos(
      photos
        .filter((item): item is { kind: 'new'; photo: SelectedPhoto } => item.kind === 'new')
        .map((item) => item.photo)
    );
  }

  function movePhotoAtIndex(photoIndex: number, direction: -1 | 1) {
    const combined = getCombinedEditablePhotos();
    const targetIndex = photoIndex + direction;
    if (targetIndex < 0 || targetIndex >= combined.length) return;

    const reordered = [...combined];
    [reordered[photoIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[photoIndex]];
    applyCombinedEditablePhotos(reordered);
  }

  function movePhotoToIndex(fromIndex: number, toIndex: number) {
    const combined = getCombinedEditablePhotos();
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= combined.length ||
      toIndex >= combined.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const reordered = [...combined];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    applyCombinedEditablePhotos(reordered);
  }

  function handlePhotoDragStart(index: number, event: React.DragEvent<HTMLDivElement>) {
    if (!isEditing) return;
    setDragFromIndex(index);
    setDragOverIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }

  function handlePhotoDragOver(index: number, event: React.DragEvent<HTMLDivElement>) {
    if (!isEditing) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handlePhotoDrop(dropIndex: number, event: React.DragEvent<HTMLDivElement>) {
    if (!isEditing) return;
    event.preventDefault();

    const fallbackFrom = Number(event.dataTransfer.getData('text/plain'));
    const fromIndex = dragFromIndex ?? (Number.isNaN(fallbackFrom) ? null : fallbackFrom);

    if (fromIndex === null) {
      setDragFromIndex(null);
      setDragOverIndex(null);
      return;
    }

    movePhotoToIndex(fromIndex, dropIndex);
    setDragFromIndex(null);
    setDragOverIndex(null);
  }

  function handlePhotoDragEnd() {
    setDragFromIndex(null);
    setDragOverIndex(null);
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

    if (isEditing && editPostId) {
      setSubmitting(true);
      let uploadedPhotoPaths: string[] = [];
      try {
        const combinedPhotos = getCombinedEditablePhotos();
        let newPhotoUrls: string[] = [];
        const uploadedUrlByPhotoId = new Map<string, string>();
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

          newPhotoUrls = uploadResult.urls;
          uploadedPhotoPaths = uploadResult.paths || [];
          selectedPhotos.forEach((photo, index) => {
            const uploadedUrl = newPhotoUrls[index];
            if (uploadedUrl) {
              uploadedUrlByPhotoId.set(photo.id, uploadedUrl);
            }
          });
        }

        const orderedPhotoUrls = combinedPhotos
          .map((photo) => {
            if (photo.kind === 'existing') return photo.existing_url;
            return uploadedUrlByPhotoId.get(photo.photo.id) || null;
          })
          .filter((url): url is string => Boolean(url));

        const result = await updatePost(supabase, {
          post_id: editPostId,
          title: title.trim(),
          description: body.trim(),
          tag_ids: selectedTagIds,
          is_global: user.is_premium ? isGlobal : false,
          photos: orderedPhotoUrls,
        });

        if (result.error) {
          if (uploadedPhotoPaths.length > 0) {
            await deletePostPhotos(supabase, uploadedPhotoPaths);
          }
          setError(result.error.message);
          return;
        }

        if (removedExistingPhotoPaths.length > 0) {
          await deletePostPhotos(supabase, removedExistingPhotoPaths);
        }

        clearSelectedPhotos();
        router.push(`/posts/${editPostId}`);
      } catch {
        setError('Could not update post. Please check your connection and try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
        <title>{isEditing ? 'Edit Post - NUSA' : 'Create Post - NUSA'}</title>
      </Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <h2 className={styles.headerTitle}>{isEditing ? 'Edit Post' : 'Create Post'}</h2>
          <button
            className={`${styles.postBtn} ${!canSubmit ? styles.postBtnDisabled : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? (isEditing ? 'Saving...' : 'Posting...') : (isEditing ? 'Save' : 'Post')}
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
              aria-label="Add post photos"
              className={styles.hiddenFileInput}
              onChange={handlePhotoInputChange}
              disabled={existingPhotos.length + selectedPhotos.length >= MAX_PHOTOS_PER_POST || submitting}
            />
            <span className={styles.photoRow}>
              <span className={styles.photoIcon}>📷</span>
              <span className={styles.photoLabel}>Add Photos (optional)</span>
              <span className={styles.photoCount}>{existingPhotos.length + selectedPhotos.length}/{MAX_PHOTOS_PER_POST}</span>
            </span>
          </label>
          <div className={styles.sectionHint}>Photos are optional and not required to publish.</div>
          <div className={styles.sectionHint}>Allowed: JPG, PNG, WEBP up to {Math.round(MAX_POST_PHOTO_BYTES / (1024 * 1024))}MB each.</div>

          {(existingPhotos.length > 0 || selectedPhotos.length > 0) && (
            <div className={styles.photoPreviewRow}>
              {getCombinedEditablePhotos().map((photo, index, arr) => {
                const isExisting = photo.kind === 'existing';
                const photoUrl = isExisting ? photo.existing_url : photo.photo.preview_url;
                const altText = isExisting ? `Existing photo ${index + 1}` : `Selected photo ${index + 1}`;

                return (
                  <div
                    key={`${isExisting ? 'existing' : 'new'}-${photoUrl}-${index}`}
                    className={`${styles.photoPreviewItem} ${isEditing ? styles.photoPreviewItemDraggable : ''} ${dragOverIndex === index ? styles.photoPreviewItemDragOver : ''} ${dragFromIndex === index ? styles.photoPreviewItemDragging : ''}`}
                    draggable={isEditing}
                    onDragStart={(event) => handlePhotoDragStart(index, event)}
                    onDragOver={(event) => handlePhotoDragOver(index, event)}
                    onDrop={(event) => handlePhotoDrop(index, event)}
                    onDragEnd={handlePhotoDragEnd}
                  >
                    <img src={photoUrl} alt={altText} className={styles.photoPreviewImage} />
                    <button
                      type="button"
                      className={styles.photoRemoveBtn}
                      onClick={() => {
                        if (isExisting) {
                          removeExistingPhoto(photo.existing_url);
                        } else {
                          removeSelectedPhoto(photo.photo.id);
                        }
                      }}
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      ✕
                    </button>

                    {isEditing && arr.length > 1 && (
                      <div className={styles.photoReorderControls}>
                        <button
                          type="button"
                          className={styles.photoReorderBtn}
                          onClick={() => movePhotoAtIndex(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move photo ${index + 1} left`}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className={styles.photoReorderBtn}
                          onClick={() => movePhotoAtIndex(index, 1)}
                          disabled={index === arr.length - 1}
                          aria-label={`Move photo ${index + 1} right`}
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isEditing && existingPhotos.length + selectedPhotos.length > 1 && (
            <div className={styles.sectionHint}>Reorder photos by drag-and-drop, or use ← and → controls on each thumbnail.</div>
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
