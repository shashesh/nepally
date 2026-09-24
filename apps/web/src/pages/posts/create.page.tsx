import React, { useState, useEffect } from 'react';
import { Alert, Button, Switch, Text, TextInput, Textarea } from '@mantine/core';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import { supabase } from '../../lib/supabase';
import { submitEditedPost, submitNewPost } from '../../lib/postSubmit';
import { userMessage } from '../../lib/userMessage';
import {
  ImageUploader,
  ToggleChipGroup,
  notify,
  useConfirm,
  type UploaderPhoto,
} from '../../components/ui';
import {
  getPostById,
  getTags,
  TAG_EMOJI,
  MAX_TAGS_PER_POST,
  MAX_PHOTOS_PER_POST,
  MAX_POST_PHOTO_BYTES,
} from '@nepally/shared';
import type { Tag } from '@nepally/shared';
import styles from '../../styles/CreatePost.module.css';

const TITLE_MAX = 150;
const TITLE_COUNTER_THRESHOLD = 120;
/** Past this the counter turns red, so the limit does not arrive as a surprise. */
const TITLE_NEAR_LIMIT = 140;
const BODY_MAX = 5000;
const BODY_COUNTER_THRESHOLD = 4500;
const BODY_NEAR_LIMIT = 4800;

export default function CreatePostPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeLocation } = useLocation();
  const confirm = useConfirm();
  const editQueryParam = router.query.edit;
  const editPostId = typeof editQueryParam === 'string' ? editQueryParam : null;
  const isEditing = Boolean(editPostId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<UploaderPhoto[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Tags are requested on mount, so the page starts out loading them.
  const [tagsLoading, setTagsLoading] = useState(true);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loadingExistingPost, setLoadingExistingPost] = useState(false);
  const [initialForm, setInitialForm] = useState<{
    title: string;
    body: string;
    selectedTagIds: string[];
    isGlobal: boolean;
    photoUrls: string[];
  }>({
    title: '',
    body: '',
    selectedTagIds: [],
    isGlobal: false,
    photoUrls: [],
  });

  const initialTagSet = new Set(initialForm.selectedTagIds);
  const currentTagSet = new Set(selectedTagIds);
  const tagsChanged =
    initialForm.selectedTagIds.length !== selectedTagIds.length ||
    selectedTagIds.some((id) => !initialTagSet.has(id)) ||
    initialForm.selectedTagIds.some((id) => !currentTagSet.has(id));
  const storedPhotoUrls = photos
    .filter((photo): photo is Extract<UploaderPhoto, { kind: 'stored' }> => photo.kind === 'stored')
    .map((photo) => photo.url);
  const photosChanged =
    photos.some((photo) => photo.kind === 'picked') ||
    initialForm.photoUrls.length !== storedPhotoUrls.length ||
    initialForm.photoUrls.some((url, index) => storedPhotoUrls[index] !== url);
  const isDirty =
    title.trim() !== initialForm.title.trim() ||
    body.trim() !== initialForm.body.trim() ||
    tagsChanged ||
    isGlobal !== initialForm.isGlobal ||
    photosChanged;
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
    let cancelled = false;
    getTags(supabase)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          setTagsError('Unable to load tags. Refresh the page and try again.');
        } else {
          setAvailableTags(result.data ?? []);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTagsError('Unable to load tags. Refresh the page and try again.');
      })
      .finally(() => {
        if (!cancelled) {
          setTagsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // When an input of the existing-post request changes, flag during render
  // whether a load is starting. The request itself runs in the effect below.
  const [existingPostRequestInputs, setExistingPostRequestInputs] = useState({
    editPostId,
    user,
    tagCount: availableTags.length,
  });
  if (
    existingPostRequestInputs.editPostId !== editPostId ||
    existingPostRequestInputs.user !== user ||
    existingPostRequestInputs.tagCount !== availableTags.length
  ) {
    setExistingPostRequestInputs({ editPostId, user, tagCount: availableTags.length });
    setLoadingExistingPost(Boolean(isEditing && editPostId && user && availableTags.length > 0));
  }

  useEffect(() => {
    if (!isEditing || !editPostId || !user || availableTags.length === 0) return;

    let cancelled = false;
    getPostById(supabase, editPostId)
      .then((result) => {
        if (cancelled) return;
        if (!result.data) {
          setError(
            result.error
              ? userMessage(result.error, "Couldn't load this post.", 'post_edit_load_failed', {
                  platform: 'web',
                  postId: editPostId,
                })
              : 'Unable to load post for editing.'
          );
          return;
        }

        if (result.data.author_id !== user.id) {
          setError('You can only edit your own posts.');
          return;
        }

        const existingTagIds = (result.data.tags || []).map((tag) => tag.id);
        const existingPhotoUrls = result.data.photos || [];
        setTitle(result.data.title || '');
        setBody(result.data.description || '');
        setSelectedTagIds(existingTagIds);
        setIsGlobal(Boolean(result.data.is_global));
        setPhotos(existingPhotoUrls.map((url) => ({ kind: 'stored' as const, url })));
        setInitialForm({
          title: result.data.title || '',
          body: result.data.description || '',
          selectedTagIds: existingTagIds,
          isGlobal: Boolean(result.data.is_global),
          photoUrls: existingPhotoUrls,
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingExistingPost(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEditing, editPostId, user, availableTags.length]);

  async function handleCancel() {
    if (isDirty) {
      const discard = await confirm({
        title: 'Discard this post?',
        message: 'You have unsaved changes. They will be lost.',
        confirmLabel: 'Discard',
        danger: true,
      });
      if (!discard) return;
    }
    if (isEditing && editPostId) {
      router.push(`/posts/${editPostId}`);
      return;
    }
    router.push('/feed');
  }

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setError('');

    if (isEditing && editPostId) {
      setSubmitting(true);
      try {
        const result = await submitEditedPost(supabase, {
          postId: editPostId,
          userId: user.id,
          title: title.trim(),
          description: body.trim(),
          tagIds: selectedTagIds,
          photos,
          isGlobal: user.is_premium ? isGlobal : false,
          originalPhotoUrls: initialForm.photoUrls,
        });

        if (!result.ok) {
          setError(result.message ?? 'Could not update post.');
          return;
        }

        router.push(`/posts/${editPostId}`);
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
    try {
      const result = await submitNewPost(supabase, {
        userId: user.id,
        title: title.trim(),
        description: body.trim(),
        tagIds: selectedTagIds,
        photos,
        isGlobal,
        metroAreaId,
        locationZipCode: user.zip_code,
        locationCity: activeLocation?.metro_name?.split('-')[0]?.trim() || 'Unknown',
        locationState: activeLocation?.metro_state || 'Unknown',
        requiresModeration,
      });

      if (!result.ok) {
        setError(result.message ?? 'Could not create post.');
        return;
      }

      if (result.pendingModeration) {
        notify.success(
          'Your emergency post was sent to a moderator for review. It will appear in the feed once approved.'
        );
      }
      router.push('/feed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user || user.trust_level < 1) return null;

  return (
    <>
      <Head>
        <title>{isEditing ? 'Edit Post - Nepally' : 'Create Post - Nepally'}</title>
      </Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <Button variant="subtle" onClick={handleCancel}>Cancel</Button>
          <h2 className={styles.headerTitle}>{isEditing ? 'Edit Post' : 'Create Post'}</h2>
          <Button disabled={!canSubmit} loading={submitting} onClick={handleSubmit}>
            {isEditing ? 'Save' : 'Post'}
          </Button>
        </div>

        {error && <Alert color="red" variant="light">{error}</Alert>}

        {/* Title */}
        <div className={styles.section}>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this about?"
            maxLength={TITLE_MAX}
            aria-label="Post title, required"
            error={!titleValid && title.length > 0 ? 'Title must be at least 5 characters' : undefined}
            description={
              title.length >= TITLE_COUNTER_THRESHOLD ? (
                <Text span size="xs" c={title.length >= TITLE_NEAR_LIMIT ? 'red' : 'dimmed'}>
                  {title.length}/{TITLE_MAX}
                </Text>
              ) : undefined
            }
          />
        </div>

        {/* Body */}
        <div className={styles.section}>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post details here..."
            maxLength={BODY_MAX}
            autosize
            minRows={6}
            aria-label="Post body, required"
            error={!bodyValid && body.length > 0 ? 'Body must be at least 10 characters' : undefined}
            description={
              body.length >= BODY_COUNTER_THRESHOLD ? (
                <Text span size="xs" c={body.length >= BODY_NEAR_LIMIT ? 'red' : 'dimmed'}>
                  {body.length}/{BODY_MAX}
                </Text>
              ) : undefined
            }
          />
        </div>

        {/* Tags */}
        <div className={styles.section}>
          <ToggleChipGroup
            label="Tags (1-3 required)"
            description={`${selectedTagIds.length}/${MAX_TAGS_PER_POST}`}
            options={availableTags.map((tag) => {
              const emoji = TAG_EMOJI[tag.slug] || '';
              return {
                value: tag.id,
                label: emoji ? `${emoji} ${tag.name}` : tag.name,
                name: `${tag.name} tag`,
              };
            })}
            value={selectedTagIds}
            onChange={setSelectedTagIds}
            max={MAX_TAGS_PER_POST}
            error={
              tagsError ??
              (!tagsValid && !tagsLoading ? 'Please select at least 1 tag' : undefined)
            }
          />

          {hasEmergencyTag && (
            <Alert color="red" variant="light" mt={10}>
              Emergency posts require moderator approval before becoming visible. This is NOT a replacement for 911.
            </Alert>
          )}
        </div>

        {/* Photos */}
        <div className={styles.section}>
          <ImageUploader
            photos={photos}
            onChange={setPhotos}
            reorderable
            max={MAX_PHOTOS_PER_POST}
            maxBytes={MAX_POST_PHOTO_BYTES}
            disabled={submitting}
            label="Photos"
            description={`Optional. JPG, PNG or WEBP up to ${Math.round(MAX_POST_PHOTO_BYTES / (1024 * 1024))}MB each. Use the ← and → buttons to reorder.`}
          />
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
            <Switch
              checked={isGlobal}
              onChange={(e) => setIsGlobal(e.currentTarget.checked)}
              aria-label="Post globally toggle"
            />
          </div>
        )}

        {postButtonHint && <Text c="dimmed" size="xs" ta="center" px={16} pb={16}>{postButtonHint}</Text>}
      </div>
    </>
  );
}
