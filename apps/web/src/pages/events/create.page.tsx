import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Center, Switch, Text } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import {
  createEvent,
  updateEvent,
  getEventById,
  createEventSchema,
  updateEventSchema,
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
  start_date: string; // Local datetime: YYYY-MM-DDTHH:mm
  end_date: string;   // Local datetime: YYYY-MM-DDTHH:mm
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

/** Convert an ISO 8601 / UTC string to a local YYYY-MM-DDTHH:mm string for form display */
function isoToLocalDatetime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Extract the date portion (YYYY-MM-DD) from a local datetime string */
function getDatePart(dt: string): string {
  return dt && dt.length >= 10 ? dt.slice(0, 10) : '';
}

/** Extract the time portion (HH:mm) from a local datetime string */
function getTimePart(dt: string): string {
  return dt && dt.length >= 16 ? dt.slice(11, 16) : '';
}

/** Combine separate date and time strings into YYYY-MM-DDTHH:mm */
function combineDateAndTime(date: string, time: string): string {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

/** Convert a local datetime string to ISO 8601 (UTC) for database storage */
function localToIso(localDt: string): string {
  if (!localDt) return '';
  const d = new Date(localDt);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

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
  const [formError, setFormError] = useState<string | null>(null);

  // Ref that always holds the current preview URL so the unmount cleanup can revoke it
  const selectedPhotoPreviewRef = useRef<string | null>(null);
  useEffect(() => {
    selectedPhotoPreviewRef.current = selectedPhotoPreview;
  }, [selectedPhotoPreview]);

  const userId = user?.id ?? '';
  const metroId = user?.metro_area_id ?? '';
  const trustLevel = user?.trust_level ?? 0;
  const isPremium = user?.is_premium ?? false;

  // Minimum date for start date picker (today)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
          start_date: isoToLocalDatetime(e.start_date),
          end_date: e.end_date ? isoToLocalDatetime(e.end_date) : '',
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

  // Revoke the object URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (selectedPhotoPreviewRef.current) {
        URL.revokeObjectURL(selectedPhotoPreviewRef.current);
      }
    };
  }, []);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFormError(null);
    },
    []
  );

  const validate = useCallback((): boolean => {
    const schema = isEditMode ? updateEventSchema : createEventSchema;
    const result = schema.safeParse({
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
  }, [form, isEditMode]);

  const handleDateChange = useCallback((field: 'start_date' | 'end_date', dateStr: string) => {
    const currentTime = getTimePart(form[field]);
    setField(field, combineDateAndTime(dateStr, currentTime));
  }, [form, setField]);

  const handleTimeChange = useCallback((field: 'start_date' | 'end_date', timeStr: string) => {
    const currentDate = getDatePart(form[field]);
    if (!currentDate) return; // date must be set first
    setField(field, combineDateAndTime(currentDate, timeStr));
  }, [form, setField]);

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setFormError('Unsupported image type. Please use JPG, PNG, or WEBP.');
      return;
    }

    if (file.size > MAX_EVENT_PHOTO_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setFormError(`Image is too large (${sizeMB} MB). Maximum allowed size is 2 MB.`);
      return;
    }

    if (selectedPhotoPreview) {
      URL.revokeObjectURL(selectedPhotoPreview);
    }

    setFormError(null);
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
      setFormError(null);
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
          setFormError(uploadResult.error?.message || 'Failed to upload event photo. Please try again.');
          return;
        }
        uploadedPhotoUrl = uploadResult.url;
      }

      const resolvedPhotoUrl = selectedPhoto
        ? uploadedPhotoUrl
        : form.photo_url || undefined;

      // Convert local datetime strings to ISO (UTC) for database storage
      const startDateIso = localToIso(form.start_date);
      const endDateIso = form.end_date ? localToIso(form.end_date) : undefined;

      if (isEditMode) {
        const result = await updateEvent(supabase, edit as string, {
          title: form.title,
          description: form.description,
          event_type: form.event_type as EventType,
          start_date: startDateIso,
          end_date: endDateIso,
          location_name: form.location_name,
          location_address: form.location_address || undefined,
          photo_url: resolvedPhotoUrl,
          rsvp_visibility: form.rsvp_visibility,
          is_global: form.is_global,
        });
        setSubmitting(false);
        if (result.error) { setFormError(result.error.message); return; }
        router.push(`/events/${edit}`);
      } else {
        const result = await createEvent(supabase, {
          title: form.title,
          description: form.description,
          event_type: form.event_type as EventType,
          start_date: startDateIso,
          end_date: endDateIso,
          location_name: form.location_name,
          location_address: form.location_address || undefined,
          photo_url: resolvedPhotoUrl,
          rsvp_visibility: form.rsvp_visibility,
          is_global: form.is_global,
          organizer_id: userId,
          metro_area_id: metroId,
        });
        setSubmitting(false);
        if (result.error) { setFormError(result.error.message); return; }
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
        <Center p="xl"><Text c="dimmed">Loading...</Text></Center>
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
              {errors.title && <Text c="red" size="xs" component="span">{errors.title}</Text>}
              <Text size="xs" c="dimmed" component="span" className={styles.charCount}>{form.title.length}/150</Text>
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
              {errors.event_type && <Text c="red" size="xs" component="span">{errors.event_type}</Text>}
            </div>

            {/* Start Date & Time — split into separate date + time inputs */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Start Date & Time *</label>
              <div className={styles.dateTimeRow}>
                <div className={styles.dateTimeField}>
                  <input
                    id="event-start-date"
                    type="date"
                    aria-label="Start date"
                    className={`${styles.input} ${errors.start_date ? styles.inputError : ''}`}
                    value={getDatePart(form.start_date)}
                    min={todayStr}
                    onChange={(e) => handleDateChange('start_date', e.target.value)}
                  />
                </div>
                <div className={styles.dateTimeField}>
                  <input
                    id="event-start-time"
                    type="time"
                    aria-label="Start time"
                    className={`${styles.input} ${errors.start_date ? styles.inputError : ''}`}
                    value={getTimePart(form.start_date)}
                    onChange={(e) => handleTimeChange('start_date', e.target.value)}
                  />
                </div>
              </div>
              {errors.start_date && <Text c="red" size="xs" component="span">{errors.start_date}</Text>}
            </div>

            {/* End Date & Time (optional) — split into separate date + time inputs */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>End Date & Time (optional)</label>
              <div className={styles.dateTimeRow}>
                <div className={styles.dateTimeField}>
                  <input
                    id="event-end-date"
                    type="date"
                    aria-label="End date"
                    className={`${styles.input} ${errors.end_date ? styles.inputError : ''}`}
                    value={getDatePart(form.end_date)}
                    min={getDatePart(form.start_date) || todayStr}
                    onChange={(e) => handleDateChange('end_date', e.target.value)}
                  />
                </div>
                <div className={styles.dateTimeField}>
                  <input
                    id="event-end-time"
                    type="time"
                    aria-label="End time"
                    className={`${styles.input} ${errors.end_date ? styles.inputError : ''}`}
                    value={getTimePart(form.end_date)}
                    onChange={(e) => handleTimeChange('end_date', e.target.value)}
                  />
                </div>
              </div>
              {errors.end_date && <Text c="red" size="xs" component="span">{errors.end_date}</Text>}
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
              {errors.location_name && <Text c="red" size="xs" component="span">{errors.location_name}</Text>}
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
              {errors.description && <Text c="red" size="xs" component="span">{errors.description}</Text>}
              <Text size="xs" c="dimmed" component="span" className={styles.charCount}>{form.description.length}/3000</Text>
            </div>

            {/* Event Photo */}
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Event Photo (optional)</label>
              {(selectedPhotoPreview || form.photo_url) ? (
                <div className={styles.photoCard}>
                  <Image
                    src={selectedPhotoPreview || form.photo_url}
                    alt="Event preview"
                    width={1200}
                    height={800}
                    unoptimized
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
                    <Button variant="subtle" color="red" size="compact-sm" onClick={handleRemovePhoto}>
                      Remove
                    </Button>
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
                  <Switch
                    id="event-is-global"
                    checked={form.is_global}
                    onChange={(e) => setField('is_global', e.currentTarget.checked)}
                  />
                </div>
              </div>
            )}

            {/* Inline error banner */}
            {formError && (
              <div className={styles.errorBanner} role="alert">
                <span>{formError}</span>
                <button type="button" className={styles.errorDismiss} onClick={() => setFormError(null)} aria-label="Dismiss error">×</button>
              </div>
            )}

            {/* Posting footer */}
            <div className={styles.postingFooter}>
              {form.is_global ? '🌐 Global — visible everywhere' : '📍 Posting to your metro area'}
            </div>

            {/* Submit */}
            <div className={styles.submitRow}>
              <Button component={Link} href="/events" variant="default">Cancel</Button>
              <Button type="submit" loading={submitting} disabled={!isFormValid}>
                {isEditMode ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
