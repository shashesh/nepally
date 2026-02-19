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
  TAG_COLORS,
  DEFAULT_TAG_COLOR,
  MAX_TAGS_PER_POST,
  MAX_PHOTOS_PER_POST,
} from '@nusa/shared';
import type { Tag } from '@nusa/shared';

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
  const [error, setError] = useState('');

  const isDirty = title.trim().length > 0 || body.trim().length > 0 || selectedTagIds.length > 0;
  const isFormValid =
    title.trim().length >= 5 &&
    body.trim().length >= 10 &&
    selectedTagIds.length >= 1 &&
    !submitting;

  const hasEmergencyTag = availableTags.some(
    (t) => t.slug === 'emergency' && selectedTagIds.includes(t.id)
  );
  const requiresModeration = availableTags.some(
    (t) => selectedTagIds.includes(t.id) && t.requires_moderation
  );

  const metroName = activeLocation
    ? `${activeLocation.metro_name}, ${activeLocation.metro_state}`
    : null;

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.trust_level < 1) {
      router.replace('/feed');
    }
  }, [user, router]);

  useEffect(() => {
    getTags(supabase).then((result) => {
      if (result.data) setAvailableTags(result.data);
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
    if (!isFormValid || !user) return;
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
      <div style={pageStyles.container}>
        {/* Header */}
        <div style={pageStyles.header}>
          <button style={pageStyles.cancelBtn} onClick={handleCancel}>
            Cancel
          </button>
          <h2 style={pageStyles.headerTitle}>Create Post</h2>
          <button
            style={{
              ...pageStyles.postBtn,
              ...(isFormValid ? {} : pageStyles.postBtnDisabled),
            }}
            onClick={handleSubmit}
            disabled={!isFormValid}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {error && <div style={pageStyles.error}>{error}</div>}

        {/* Title */}
        <div style={pageStyles.titleSection}>
          <input
            style={pageStyles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's this about?"
            maxLength={TITLE_MAX}
            aria-label="Post title, required"
          />
          {title.length >= TITLE_COUNTER_THRESHOLD && (
            <span
              style={{
                ...pageStyles.charCounter,
                ...(title.length >= 140 ? { color: 'var(--color-error)' } : {}),
              }}
            >
              {title.length}/{TITLE_MAX}
            </span>
          )}
        </div>

        {/* Body */}
        <div style={pageStyles.bodySection}>
          <textarea
            style={pageStyles.bodyInput}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your post details here..."
            maxLength={BODY_MAX}
            aria-label="Post body, required"
          />
          {body.length >= BODY_COUNTER_THRESHOLD && (
            <span
              style={{
                ...pageStyles.charCounter,
                ...(body.length >= 4800 ? { color: 'var(--color-error)' } : {}),
              }}
            >
              {body.length}/{BODY_MAX}
            </span>
          )}
        </div>

        {/* Tags */}
        <div style={pageStyles.section}>
          <div style={pageStyles.sectionLabel}>Tags (1-3 required)</div>
          <div style={pageStyles.tagGrid}>
            {availableTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              const tagColor = tag.color || TAG_COLORS[tag.slug] || DEFAULT_TAG_COLOR;
              const emoji = TAG_EMOJI[tag.slug] || '';
              const isDisabled = !isSelected && selectedTagIds.length >= MAX_TAGS_PER_POST;

              return (
                <button
                  key={tag.id}
                  style={{
                    ...pageStyles.tagChip,
                    ...(isSelected
                      ? {
                          backgroundColor: `${tagColor}26`,
                          borderColor: tagColor,
                          borderWidth: 2,
                          color: tagColor,
                          fontWeight: 600,
                        }
                      : {}),
                    ...(isDisabled ? { opacity: 0.5, cursor: 'default' } : {}),
                  }}
                  onClick={() => toggleTag(tag.id)}
                  disabled={isDisabled}
                  aria-label={`${tag.name} tag, ${isSelected ? 'selected' : 'not selected'}`}
                >
                  {emoji ? `${emoji} ${tag.name}` : tag.name}
                </button>
              );
            })}
          </div>

          {hasEmergencyTag && (
            <div style={pageStyles.emergencyWarning}>
              Emergency posts require moderator approval before becoming visible. This is NOT a replacement for 911.
            </div>
          )}
        </div>

        {/* Photo Attachment */}
        <div style={pageStyles.section}>
          <div style={pageStyles.photoRow}>
            <span style={{ fontSize: 20 }}>📷</span>
            <span style={pageStyles.photoLabel}>Add Photos (optional)</span>
            <span style={pageStyles.photoCount}>0/{MAX_PHOTOS_PER_POST}</span>
          </div>
        </div>

        {/* Location Info */}
        {metroName && (
          <div style={pageStyles.locationRow}>
            📍 Posting to: {metroName}
          </div>
        )}

        {/* Global Toggle (Premium Only) */}
        {user.is_premium && (
          <div style={pageStyles.globalRow}>
            <div>
              <div style={pageStyles.globalLabel}>🌐 Post Globally</div>
              <div style={pageStyles.globalSublabel}>Visible in all metro areas</div>
            </div>
            <label style={pageStyles.toggleLabel}>
              <input
                type="checkbox"
                checked={isGlobal}
                onChange={(e) => setIsGlobal(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
                aria-label="Post globally toggle"
              />
            </label>
          </div>
        )}
      </div>
    </>
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 640,
    margin: '0 auto',
    background: '#FFFFFF',
    borderRadius: 12,
    border: '1px solid var(--color-border)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--color-border)',
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    fontSize: 16,
    color: 'var(--color-primary)',
    cursor: 'pointer',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 600,
    margin: 0,
  },
  postBtn: {
    backgroundColor: 'var(--color-primary)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: 16,
    padding: '6px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  postBtnDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#BDBDBD',
    cursor: 'not-allowed',
  },
  error: {
    background: '#FFEBEE',
    color: 'var(--color-error)',
    padding: '12px 16px',
    fontSize: 14,
  },
  titleSection: {
    padding: '16px',
  },
  titleInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 20,
    fontWeight: 600,
    color: '#212121',
    background: 'transparent',
  },
  bodySection: {
    padding: '16px',
    borderTop: '1px solid #E0E0E0',
  },
  bodyInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 16,
    color: '#212121',
    background: 'transparent',
    minHeight: 150,
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  charCounter: {
    display: 'block',
    textAlign: 'right' as const,
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  section: {
    padding: 16,
    borderTop: '1px solid #E0E0E0',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: '#757575',
    marginBottom: 12,
  },
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  tagChip: {
    height: 36,
    padding: '0 14px',
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    border: '1px solid #E0E0E0',
    cursor: 'pointer',
    fontSize: 14,
    color: '#757575',
    display: 'inline-flex',
    alignItems: 'center',
  },
  emergencyWarning: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 12,
    color: 'var(--color-error)',
    lineHeight: 1.5,
  },
  photoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 48,
  },
  photoLabel: {
    fontSize: 15,
    color: '#757575',
    flex: 1,
  },
  photoCount: {
    fontSize: 14,
    color: '#757575',
  },
  locationRow: {
    padding: '12px 16px',
    backgroundColor: '#F5F5F5',
    borderTop: '1px solid #E0E0E0',
    fontSize: 14,
    color: '#757575',
  },
  globalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderTop: '1px solid #E0E0E0',
  },
  globalLabel: {
    fontSize: 15,
    fontWeight: 500,
    color: '#212121',
  },
  globalSublabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  toggleLabel: {
    cursor: 'pointer',
  },
};
