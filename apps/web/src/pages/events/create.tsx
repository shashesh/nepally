import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  createEvent,
  updateEvent,
  getEventById,
  createEventSchema,
  uploadEventPhoto,
  MAX_EVENT_PHOTO_BYTES,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  TrustLevel,
  type EventType,
} from '@nusa/shared';
import styles from './createEvent.module.css';

const TYPE_ACTIVE_CLASS: Record<EventType, string> = {
  cultural: 'typeChipActiveCultural',
  religious: 'typeChipActiveReligious',
  social: 'typeChipActiveSocial',
  career: 'typeChipActiveCareer',
  other: 'typeChipActiveOther',
};

interface FormState {
  title: string;
  description: string;
  event_type: EventType | '';
  start_date: string;
  end_date: string;
  location_name: string;
  location_address: string;
  photo_url: string;
  rsvp_visibility: 'public' | 'private';
  is_global: boolean;
}

const EMPTY: FormState = {
  title: '',
  description: '',
  event_type: '',
  start_date: '',
  end_date: '',
  location_name: '',
  location_address: '',
  photo_url: '',
  rsvp_visibility: 'public',
  is_global: false,
};

export default function CreateEventPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { edit } = router.query;
  const isEditMode = !!edit && typeof edit === 'string';

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const userId = (user as any)?.id ?? '';
  const metroId = (user as any)?.metro_area_id ?? '';
  const trustLevel = (user as any)?.trust_level ?? 0;
  const isPremium = (user as any)?.is_premium ?? false;

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (trustLevel < TrustLevel.VERIFIED) { router.replace('/events'); return; }
  }, [user, trustLevel, router]);

  useEffect(() => {
    if (!isEditMode) { setLoadingEdit(false); return; }
    (async () => {
      const result = await getEventById(supabase, edit as string);
      if (result.data) {
        const e = result.data;
        setForm({
          title: e.title,
          description: e.description,
          event_type: e.event_type,
          start_date: e.start_date,
          end_date: e.end_date ?? '',
          location_name: e.location_name,
          location_address: e.location_address ?? '',
          photo_url: e.photo_url ?? '',
          rsvp_visibility: e.rsvp_visibility,
          is_global: e.is_global,
        });
      }
      setLoadingEdit(false);
    })();
  }, [isEditMode, edit]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const validate = useCallback((): boolean => {
    const result = createEventSchema.safeParse({
      ...form,
      event_type: form.event_type || undefined,
      end_date: form.end_date || undefined,
      location_address: form.location_address || undefined,
      photo_url: form.photo_url || undefined,
    });

    if (!result.success) {
      const newErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!newErrors[key]) newErrors[key] = issue.message;
      }
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [form]);

  const normalizeDateTimeLocal = useCallback((value: string): string => {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
  }, []);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Unsupported image type. Allowed: JPG, PNG, WEBP');
      return;
    }

    if (file.size > MAX_EVENT_PHOTO_BYTES) {
      alert('Event photo must be 2MB or smaller');
      return;
    }

    if (selectedPhotoPreview) {
      URL.revokeObjectURL(selectedPhotoPreview);
    }

    setSelectedPhoto(file);
    setSelectedPhotoPreview(URL.createObjectURL(file));
    setField('photo_url', '');
  }, [selectedPhotoPreview, setField]);

  const handleRemovePhoto = useCallback(() => {
    if (selectedPhotoPreview) {
      URL.revokeObjectURL(selectedPhotoPreview);
    }
    setSelectedPhoto(null);
    setSelectedPhotoPreview(null);
    setField('photo_url', '');
  }, [selectedPhotoPreview, setField]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate() || submitting) return;
      setSubmitting(true);

      let uploadedPhotoUrl: string | undefined;
      if (selectedPhoto && userId) {
        const fileData = await selectedPhoto.arrayBuffer();
        const uploadResult = await uploadEventPhoto(supabase, {
          user_id: userId,
          file_data: fileData,
          mime_type: selectedPhoto.type || 'image/jpeg',
          size_bytes: selectedPhoto.size,
          file_name: selectedPhoto.name,
        });
        if (uploadResult.error || !uploadResult.url) {
          setSubmitting(false);
          alert(uploadResult.error?.message || 'Failed to upload event photo');
          return;
        }
        uploadedPhotoUrl = uploadResult.url;
      }

      const resolvedPhotoUrl = selectedPhoto
        ? uploadedPhotoUrl
        : form.photo_url || undefined;

      if (isEditMode) {
        const result = await updateEvent(supabase, edit as string, {
          title: form.title,
          description: form.description,
          event_type: form.event_type as EventType,
          start_date: form.start_date,
          end_date: form.end_date || undefined,
          location_name: form.location_name,
          location_address: form.location_address || undefined,
          photo_url: resolvedPhotoUrl,
          rsvp_visibility: form.rsvp_visibility,
          is_global: form.is_global,
        });
        setSubmitting(false);
        if (result.error) { alert(result.error.message); return; }
        router.push(`/events/${edit}`);
      } else {
        const result = await createEvent(supabase, {
          title: form.title,
          description: form.description,
          event_type: form.event_type as EventType,
          start_date: form.start_date,
          end_date: form.end_date || undefined,
          location_name: form.location_name,
          location_address: form.location_address || undefined,
          photo_url: resolvedPhotoUrl,
          rsvp_visibility: form.rsvp_visibility,
          is_global: form.is_global,
          organizer_id: userId,
          metro_area_id: metroId,
        });
        setSubmitting(false);
        if (result.error) { alert(result.error.message); return; }
        if (result.data) router.push(`/events/${result.data.id}`);
      }
    },
    [form, validate, submitting, isEditMode, edit, userId, metroId, router, selectedPhoto]
  );

  if (!user) return null;

  const isFormValid = !!(
    form.title.trim().length >= 5 &&
    form.description.trim().length >= 10 &&
    form.event_type &&
    form.start_date &&
    form.location_name.trim().length >= 5
  );

  if (loadingEdit) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{isEditMode ? 'Edit Event' : 'Create Event'} - NUSA</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.header}>
            <Link href="/events" className={styles.backLink}>← Events</Link>
            <h1 className={styles.title}>{isEditMode ? 'Edit Event' : 'Create Event'}</h1>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            {/* Event Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="event-title">Event Name *</label>
              <input
                id="event-title"
                className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                placeholder="e.g. Dashain Celebration 2026"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                maxLength={150}
              />
              {errors.title && <span className={styles.errorText}>{errors.title}</span>}
              <span className={styles.charCount}>{form.title.length}/150</span>
            </div>

            {/* Event Type */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Event Type *</label>
              <div className={styles.typeChips}>
                {EVENT_TYPES.map((t) => {
                  const isSelected = form.event_type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.typeChip} ${isSelected ? styles.typeChipActive : ''} ${isSelected ? styles[TYPE_ACTIVE_CLASS[t]] : ''}`}
                      onClick={() => setField('event_type', t)}
                    >
                      {EVENT_TYPE_ICONS[t]} {EVENT_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
              {errors.event_type && <span className={styles.errorText}>{errors.event_type}</span>}
            </div>

            {/* Start Date */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="event-start-date">Start Date & Time *</label>
              <input
                id="event-start-date"
                type="datetime-local"
                className={`${styles.input} ${errors.start_date ? styles.inputError : ''}`}
                value={form.start_date ? form.start_date.slice(0, 16) : ''}
                onChange={(e) => setField('start_date', normalizeDateTimeLocal(e.target.value))}
              />
              {errors.start_date && <span className={styles.errorText}>{errors.start_date}</span>}
            </div>

            {/* End Date */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="event-end-date">End Date & Time (optional)</label>
              <input
                id="event-end-date"
                type="datetime-local"
                className={`${styles.input} ${errors.end_date ? styles.inputError : ''}`}
                value={form.end_date ? form.end_date.slice(0, 16) : ''}
                onChange={(e) => setField('end_date', normalizeDateTimeLocal(e.target.value))}
              />
              {errors.end_date && <span className={styles.errorText}>{errors.end_date}</span>}
            </div>

            {/* Location Name */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="event-location-name">Location Name *</label>
              <input
                id="event-location-name"
                className={`${styles.input} ${errors.location_name ? styles.inputError : ''}`}
                placeholder="e.g. Dallas Convention Center"
                value={form.location_name}
                onChange={(e) => setField('location_name', e.target.value)}
                maxLength={100}
              />
              {errors.location_name && <span className={styles.errorText}>{errors.location_name}</span>}
            </div>

            {/* Location Address */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="event-location-address">Address (optional)</label>
              <input
                id="event-location-address"
                className={styles.input}
                placeholder="Full address for attendees"
                value={form.location_address}
                onChange={(e) => setField('location_address', e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="event-description">Description *</label>
              <textarea
                id="event-description"
                className={`${styles.input} ${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                placeholder="Tell people about your event..."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={3000}
              />
              {errors.description && <span className={styles.errorText}>{errors.description}</span>}
              <span className={styles.charCount}>{form.description.length}/3000</span>
            </div>

            {/* Event Photo */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Event Photo (optional)</label>
              {(selectedPhotoPreview || form.photo_url) ? (
                <div className={styles.photoCard}>
                  <img
                    src={selectedPhotoPreview || form.photo_url}
                    alt="Event preview"
                    className={styles.photoPreview}
                  />
                  <div className={styles.photoActions}>
                    <label className={styles.photoBtnSecondary}>
                      Change Photo
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className={styles.hiddenInput}
                        onChange={handlePhotoChange}
                      />
                    </label>
                    <button type="button" className={styles.photoBtnDanger} onClick={handleRemovePhoto}>
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className={styles.photoPicker}>
                  Add Event Photo
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className={styles.hiddenInput}
                    onChange={handlePhotoChange}
                  />
                  <span className={styles.photoHelp}>Max 2MB - JPG, PNG, WEBP</span>
                </label>
              )}
            </div>

            {/* RSVP Visibility */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>RSVP Visibility</label>
              <div className={styles.radioGroup}>
                {(['public', 'private'] as const).map((v) => (
                  <label key={v} className={styles.radioOption}>
                    <input
                      type="radio"
                      className={styles.radioInput}
                      name="rsvp_visibility"
                      value={v}
                      checked={form.rsvp_visibility === v}
                      onChange={() => setField('rsvp_visibility', v)}
                    />
                    <span className={styles.radioLabel}>
                      {v === 'public' ? "🌍 Public — anyone can see who's going" : '🔒 Private — only you see the attendee list'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Global toggle (premium only) */}
            {isPremium && (
              <div className={styles.fieldGroup}>
                <div className={styles.switchRow}>
                  <label className={styles.switchLabel} htmlFor="event-is-global">
                    <span className={styles.switchTitle}>🌐 Make Global</span>
                    <span className={styles.switchSubtitle}>Visible across all metro areas</span>
                  </label>
                  <input
                    id="event-is-global"
                    type="checkbox"
                    className={styles.switchInput}
                    checked={form.is_global}
                    onChange={(e) => setField('is_global', e.target.checked)}
                  />
                </div>
              </div>
            )}

            {/* Posting footer */}
            <div className={styles.postingFooter}>
              {form.is_global ? '🌐 Global — visible everywhere' : '📍 Posting to your metro area'}
            </div>

            {/* Submit */}
            <div className={styles.submitRow}>
              <Link href="/events" className={styles.cancelBtn}>Cancel</Link>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting || !isFormValid}
              >
                {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
