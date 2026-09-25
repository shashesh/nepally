import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Center, Radio, Switch, Text, TextInput, Textarea } from '@mantine/core';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { toPhotoUploadInputs } from '../../lib/photoUploads';
import { userMessage } from '../../lib/userMessage';
import { ImageUploader, ToggleChipGroup, type UploaderPhoto } from '../../components/ui';
import { DateTimeField } from '../../components/events/DateTimeField';
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
} from '@nepally/shared';
import styles from './createEvent.module.css';

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
  const editId = typeof edit === 'string' && edit ? edit : null;
  const isEditMode = editId !== null;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  // Id of the event whose data has been loaded into the form (edit mode only).
  const [loadedEditId, setLoadedEditId] = useState<string | null>(null);
  const loadingEdit = isEditMode && loadedEditId !== editId;
  const [photos, setPhotos] = useState<UploaderPhoto[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const userId = user?.id ?? '';
  const metroId = user?.metro_area_id ?? '';
  const trustLevel = user?.trust_level ?? 0;
  const isPremium = user?.is_premium ?? false;

  // Minimum date for start date picker (today in local time, not UTC)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (trustLevel < TrustLevel.VERIFIED) { router.replace('/events'); return; }
  }, [user, trustLevel, router]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      const result = await getEventById(supabase, editId);
      if (cancelled) return;
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
        setPhotos(e.photo_url ? [{ kind: 'stored', url: e.photo_url }] : []);
      }
      setLoadedEditId(editId);
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      setFormError(null);
    },
    []
  );

  const handlePhotosChange = useCallback(
    (next: UploaderPhoto[]) => {
      setPhotos(next);
      const stored = next.find((photo) => photo.kind === 'stored');
      setField('photo_url', stored?.kind === 'stored' ? stored.url : '');
    },
    [setField]
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      if (!validate() || submitting) return;
      setSubmitting(true);

      const pickedPhoto = photos.find((photo) => photo.kind === 'picked');
      let uploadedPhotoUrl: string | undefined;
      if (pickedPhoto?.kind === 'picked' && userId) {
        const [uploadInput] = await toPhotoUploadInputs([pickedPhoto.file], userId);
        const uploadResult = await uploadEventPhoto(supabase, uploadInput);
        if (uploadResult.error || !uploadResult.url) {
          setSubmitting(false);
          const uploadFailed = "Couldn't upload the event photo. Please try again.";
          setFormError(
            uploadResult.error
              ? userMessage(uploadResult.error, uploadFailed, 'event_photo_upload_failed', { platform: 'web', userId })
              : uploadFailed
          );
          return;
        }
        uploadedPhotoUrl = uploadResult.url;
      }

      // A stored photo the member left alone keeps its URL; removing it
      // entirely leaves neither, which clears the event's photo.
      const storedPhoto = photos.find((photo) => photo.kind === 'stored');
      const resolvedPhotoUrl = pickedPhoto
        ? uploadedPhotoUrl
        : (storedPhoto?.kind === 'stored' ? storedPhoto.url : undefined);

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
        if (result.error) {
          setFormError(
            userMessage(result.error, "Couldn't update the event. Please try again.", 'event_update_failed', {
              platform: 'web',
              eventId: edit,
            })
          );
          return;
        }
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
        if (result.error) {
          setFormError(
            userMessage(result.error, "Couldn't create the event. Please try again.", 'event_create_failed', {
              platform: 'web',
              userId,
            })
          );
          return;
        }
        if (result.data) router.push(`/events/${result.data.id}`);
      }
    },
    [form, validate, submitting, isEditMode, edit, userId, metroId, router, photos]
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
        <title>{isEditMode ? 'Edit Event' : 'Create Event'} - Nepally</title>
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
              <TextInput
                id="event-title"
                label="Event Name *"
                placeholder="e.g. Dashain Celebration 2026"
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                maxLength={150}
                error={errors.title}
                description={`${form.title.length}/150`}
              />
            </div>

            {/* Event Type */}
            <div className={styles.fieldGroup}>
              <ToggleChipGroup
                label="Event Type *"
                mode="single"
                options={EVENT_TYPES.map((t) => ({
                  value: t,
                  label: `${EVENT_TYPE_ICONS[t]} ${EVENT_TYPE_LABELS[t]}`,
                }))}
                value={form.event_type ? [form.event_type] : []}
                onChange={([next]) => setField('event_type', (next ?? '') as EventType | '')}
                error={errors.event_type}
              />
            </div>

            {/* Start Date & Time */}
            <div className={styles.fieldGroup}>
              <DateTimeField
                label="Start Date & Time *"
                value={form.start_date}
                onChange={(value) => setField('start_date', value)}
                dateId="event-start-date"
                timeId="event-start-time"
                dateLabel="Start date"
                timeLabel="Start time"
                minDate={todayStr}
                error={errors.start_date}
              />
            </div>

            {/* End Date & Time (optional) */}
            <div className={styles.fieldGroup}>
              <DateTimeField
                label="End Date & Time (optional)"
                value={form.end_date}
                onChange={(value) => setField('end_date', value)}
                dateId="event-end-date"
                timeId="event-end-time"
                dateLabel="End date"
                timeLabel="End time"
                minDate={form.start_date.slice(0, 10) || todayStr}
                error={errors.end_date}
              />
            </div>

            {/* Location Name */}
            <div className={styles.fieldGroup}>
              <TextInput
                id="event-location-name"
                label="Location Name *"
                placeholder="e.g. Dallas Convention Center"
                value={form.location_name}
                onChange={(e) => setField('location_name', e.target.value)}
                maxLength={100}
                error={errors.location_name}
              />
            </div>

            {/* Location Address */}
            <div className={styles.fieldGroup}>
              <TextInput
                id="event-location-address"
                label="Address (optional)"
                placeholder="Full address for attendees"
                value={form.location_address}
                onChange={(e) => setField('location_address', e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className={styles.fieldGroup}>
              <Textarea
                id="event-description"
                label="Description *"
                placeholder="Tell people about your event..."
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                maxLength={3000}
                autosize
                minRows={4}
                error={errors.description}
                description={`${form.description.length}/3000`}
              />
            </div>

            {/* Event Photo */}
            <div className={styles.fieldGroup}>
              <ImageUploader
                photos={photos}
                onChange={handlePhotosChange}
                max={1}
                maxBytes={MAX_EVENT_PHOTO_BYTES}
                disabled={submitting}
                label="Event photo"
                description="Optional. Max 2MB — JPG, PNG or WEBP."
              />
            </div>

            {/* RSVP Visibility */}
            <div className={styles.fieldGroup}>
              <Radio.Group
                label="RSVP Visibility"
                value={form.rsvp_visibility}
                onChange={(value) => setField('rsvp_visibility', value as 'public' | 'private')}
              >
                <div className={styles.radioGroup}>
                  <Radio value="public" label="🌍 Public — anyone can see who's going" />
                  <Radio value="private" label="🔒 Private — only you see the attendee list" />
                </div>
              </Radio.Group>
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
              <Alert color="red" variant="light" withCloseButton closeButtonLabel="Dismiss error" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
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
