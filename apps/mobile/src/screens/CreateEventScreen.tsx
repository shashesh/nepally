import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  createEvent,
  updateEvent,
  getEventById,
  createEventSchema,
  uploadEventPhoto,
  EVENT_TYPES,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_ICONS,
  type EventType,
} from '@nepally/shared';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../config/supabase';
import { colors } from '../styles/colors';
import { spacing, borderRadius } from '../styles/spacing';
import { typography } from '../styles/typography';
import type { EventsStackParamList } from '../types/navigation';

type Nav = NativeStackNavigationProp<EventsStackParamList>;
type Route = RouteProp<EventsStackParamList, 'CreateEvent'>;

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

const EMPTY_FORM: FormState = {
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

interface SelectedPhoto {
  uri: string;
  mime_type: string;
  file_name?: string;
}

export default function CreateEventScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const editEventId = route.params?.editEventId;
  const isEditMode = !!editEventId;

  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedPhoto | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [pickerField, setPickerField] = useState<'start_date' | 'end_date'>('start_date');
  const [pickerValue, setPickerValue] = useState(new Date());
  const [pickerDraftDate, setPickerDraftDate] = useState<Date | null>(null);
  const isDirty = useRef(false);

  const metroId = user?.metro_area_id ?? '';
  const isPremium = user?.is_premium ?? false;
  const canCreateGlobal = isPremium;

  // Load event data in edit mode
  useEffect(() => {
    if (!isEditMode || !editEventId) return;
    (async () => {
      const result = await getEventById(supabase, editEventId);
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
  }, [isEditMode, editEventId]);

  const setField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      isDirty.current = true;
      setForm((prev) => ({ ...prev, [key]: value }));
      // Clear error on change
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  const parseIsoDate = useCallback((value: string): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, []);

  const formatDateTimeLabel = useCallback(
    (value: string, placeholder: string): string => {
      const parsed = parseIsoDate(value);
      if (!parsed) return placeholder;
      const dateText = parsed.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timeText = parsed.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
      return `${dateText} at ${timeText}`;
    },
    [parseIsoDate]
  );

  const openDateTimePicker = useCallback(
    (field: 'start_date' | 'end_date') => {
      const existingFieldDate = parseIsoDate(form[field]);
      const fallbackDate = field === 'end_date' ? parseIsoDate(form.start_date) : null;
      const initialDate = existingFieldDate ?? fallbackDate ?? new Date();

      setPickerField(field);
      setPickerMode('date');
      setPickerDraftDate(null);
      setPickerValue(initialDate);
      setPickerVisible(true);
    },
    [form, parseIsoDate]
  );

  const handleDateTimeChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (event.type === 'dismissed') {
        setPickerVisible(false);
        setPickerDraftDate(null);
        setPickerMode('date');
        return;
      }

      if (!selectedDate) return;

      if (pickerMode === 'date') {
        const existing = parseIsoDate(form[pickerField]) ?? new Date();
        const dateWithExistingTime = new Date(selectedDate);
        dateWithExistingTime.setHours(existing.getHours(), existing.getMinutes(), 0, 0);

        setPickerDraftDate(dateWithExistingTime);
        setPickerValue(dateWithExistingTime);
        setPickerMode('time');

        // Android needs an explicit re-open after mode change.
        if (Platform.OS === 'android') {
          setPickerVisible(false);
          requestAnimationFrame(() => setPickerVisible(true));
        }
        return;
      }

      const base = pickerDraftDate ?? pickerValue;
      const combined = new Date(base);
      combined.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);

      setField(pickerField, combined.toISOString());
      setPickerVisible(false);
      setPickerDraftDate(null);
      setPickerMode('date');
    },
    [form, parseIsoDate, pickerMode, pickerField, pickerDraftDate, pickerValue, setField]
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
        if (!newErrors[key]) {
          newErrors[key] = issue.message;
        }
      }
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [form]);

  const handleCancel = useCallback(() => {
    if (isDirty.current) {
      Alert.alert(
        isEditMode ? 'Discard Changes?' : 'Discard Event?',
        'Your changes will be lost.',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  }, [isEditMode, navigation]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    if (submitting) return;
    setSubmitting(true);

    let uploadedPhotoUrl: string | undefined;
    if (selectedPhoto && user?.id) {
      const base64 = await FileSystem.readAsStringAsync(selectedPhoto.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const uploadResult = await uploadEventPhoto(supabase, {
        user_id: user.id,
        file_data: bytes.buffer as ArrayBuffer,
        mime_type: selectedPhoto.mime_type,
        size_bytes: bytes.length,
        file_name: selectedPhoto.file_name,
      });

      if (uploadResult.error || !uploadResult.url) {
        setSubmitting(false);
        Alert.alert('Upload Error', uploadResult.error?.message || 'Failed to upload event photo');
        return;
      }
      uploadedPhotoUrl = uploadResult.url;
    }

    const resolvedPhotoUrl = selectedPhoto
      ? uploadedPhotoUrl
      : form.photo_url || undefined;

    if (isEditMode && editEventId) {
      const result = await updateEvent(supabase, editEventId, {
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
      if (result.error) {
        Alert.alert('Error', result.error.message);
        return;
      }
      navigation.navigate('EventDetail', { eventId: editEventId });
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
        organizer_id: user!.id,
        metro_area_id: metroId,
      });

      setSubmitting(false);
      if (result.error) {
        Alert.alert('Error', result.error.message);
        return;
      }
      if (result.data) {
        navigation.navigate('EventDetail', { eventId: result.data.id });
      }
    }
  }, [form, validate, submitting, isEditMode, editEventId, user, metroId, navigation, selectedPhoto]);

  const requestPhotoPermission = useCallback(async (): Promise<boolean> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;

    Alert.alert(
      'Photo Library Access Required',
      'Nepally needs photo library access so you can upload an event photo.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }, []);

  const handlePickPhoto = useCallback(async () => {
    const hasPermission = await requestPhotoPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      Alert.alert('Invalid Photo', 'Unsupported image type. Allowed: JPG, PNG, WEBP');
      return;
    }

    setSelectedPhoto({
      uri: asset.uri,
      mime_type: mimeType,
      file_name: asset.fileName || undefined,
    });
    setField('photo_url', '');
  }, [requestPhotoPermission, setField]);

  const handleRemovePhoto = useCallback(() => {
    setSelectedPhoto(null);
    setField('photo_url', '');
  }, [setField]);

  if (loadingEdit) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </SafeAreaView>
    );
  }

  const isFormValid = !!(
    form.title.trim().length >= 5 &&
    form.description.trim().length >= 10 &&
    form.event_type &&
    form.start_date &&
    form.location_name.trim().length >= 5
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.navButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>{isEditMode ? 'Edit Event' : 'Create Event'}</Text>
        <TouchableOpacity
          style={[styles.submitButton, !isFormValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitText}>{isEditMode ? 'Save' : 'Create'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Event Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="e.g. Dashain Celebration 2026"
            value={form.title}
            onChangeText={(v) => setField('title', v)}
            maxLength={150}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          <Text style={styles.charCount}>{form.title.length}/150</Text>
        </View>

        {/* Event Type */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Event Type *</Text>
          <View style={styles.typeChips}>
            {EVENT_TYPES.map((t) => {
              const typeColors = EVENT_TYPE_COLORS[t];
              const isSelected = form.event_type === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeChip,
                    isSelected && { backgroundColor: typeColors.background, borderColor: typeColors.text },
                  ]}
                  onPress={() => setField('event_type', t)}
                >
                  <Text style={[styles.typeChipText, isSelected && { color: typeColors.text }]}>
                    {EVENT_TYPE_ICONS[t]} {EVENT_TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.event_type && <Text style={styles.errorText}>{errors.event_type}</Text>}
        </View>

        {/* Start Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Start Date & Time *</Text>
          <TouchableOpacity
            style={[styles.input, styles.dateTimeButton, errors.start_date && styles.inputError]}
            onPress={() => openDateTimePicker('start_date')}
          >
            <Text
              style={[
                styles.dateTimeText,
                !form.start_date && styles.dateTimePlaceholder,
              ]}
            >
              {formatDateTimeLabel(form.start_date, 'Select start date and time')}
            </Text>
          </TouchableOpacity>
          {errors.start_date && <Text style={styles.errorText}>{errors.start_date}</Text>}
        </View>

        {/* End Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>End Date & Time (optional)</Text>
          <TouchableOpacity
            style={[styles.input, styles.dateTimeButton, errors.end_date && styles.inputError]}
            onPress={() => openDateTimePicker('end_date')}
          >
            <Text
              style={[
                styles.dateTimeText,
                !form.end_date && styles.dateTimePlaceholder,
              ]}
            >
              {formatDateTimeLabel(form.end_date, 'Select end date and time (optional)')}
            </Text>
          </TouchableOpacity>
          {errors.end_date && <Text style={styles.errorText}>{errors.end_date}</Text>}
        </View>

        {/* Location Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Location Name *</Text>
          <TextInput
            style={[styles.input, errors.location_name && styles.inputError]}
            placeholder="e.g. Dallas Convention Center"
            value={form.location_name}
            onChangeText={(v) => setField('location_name', v)}
            maxLength={100}
          />
          {errors.location_name && <Text style={styles.errorText}>{errors.location_name}</Text>}
        </View>

        {/* Location Address */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Address (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Full address for attendees"
            value={form.location_address}
            onChangeText={(v) => setField('location_address', v)}
            maxLength={200}
          />
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            placeholder="Tell people about your event..."
            value={form.description}
            onChangeText={(v) => setField('description', v)}
            multiline
            numberOfLines={5}
            maxLength={3000}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          <Text style={styles.charCount}>{form.description.length}/3000</Text>
        </View>

        {/* Event Photo */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Event Photo (optional)</Text>
          {(selectedPhoto || form.photo_url) ? (
            <View style={styles.photoCard}>
              <Image
                source={selectedPhoto?.uri ?? form.photo_url}
                style={styles.photoPreview}
                contentFit="cover"
              />
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoActionButton} onPress={handlePickPhoto}>
                  <Text style={styles.photoActionText}>Change Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionDanger} onPress={handleRemovePhoto}>
                  <Text style={styles.photoActionDangerText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoPickerButton} onPress={handlePickPhoto}>
              <Text style={styles.photoPickerButtonText}>Add Event Photo</Text>
              <Text style={styles.photoHelperText}>Max 2MB - JPG, PNG, WEBP</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* RSVP Visibility */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>RSVP Visibility</Text>
          <View style={styles.radioGroup}>
            {(['public', 'private'] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={styles.radioOption}
                onPress={() => setField('rsvp_visibility', v)}
              >
                <View style={[styles.radioCircle, form.rsvp_visibility === v && styles.radioCircleSelected]} />
                <Text style={styles.radioLabel}>
                  {v === 'public' ? '🌍 Public — anyone can see who\'s going' : '🔒 Private — only you see the attendee list'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Global toggle (premium only) */}
        {canCreateGlobal && (
          <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>🌐 Make Global</Text>
                <Text style={styles.switchSubtitle}>Visible across all metro areas</Text>
              </View>
              <Switch
                value={form.is_global}
                onValueChange={(v) => setField('is_global', v)}
                trackColor={{ true: colors.primary.main }}
              />
            </View>
          </View>
        )}

        {/* Posting footer */}
        <View style={styles.postingFooter}>
          <Text style={styles.postingFooterText}>
            {form.is_global ? '🌐 Global — visible everywhere' : `📍 Posting to your metro area`}
          </Text>
        </View>
      </ScrollView>

      {pickerVisible && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          display="default"
          is24Hour={false}
          onChange={handleDateTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navButton: {
    minWidth: 60,
  },
  navTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 17,
  },
  cancelText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.button,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: colors.text.disabled,
  },
  submitText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.s,
    gap: 0,
  },
  fieldGroup: {
    marginBottom: spacing.s,
  },
  label: {
    ...typography.label,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    padding: 12,
    ...typography.body,
    color: colors.text.primary,
  },
  dateTimeButton: {
    justifyContent: 'center',
    minHeight: 48,
  },
  dateTimeText: {
    ...typography.body,
    color: colors.text.primary,
  },
  dateTimePlaceholder: {
    color: colors.text.secondary,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  charCount: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main,
  },
  radioLabel: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    fontSize: 14,
  },
  photoPickerButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing.s,
  },
  photoPickerButtonText: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  photoHelperText: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 4,
  },
  photoCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    padding: spacing.xs,
    gap: 10,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.card,
    backgroundColor: colors.background,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  photoActionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoActionText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  photoActionDanger: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.button,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  photoActionDangerText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.card,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchLabel: {
    flex: 1,
  },
  switchSubtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  postingFooter: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.card,
    padding: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.l,
  },
  postingFooterText: {
    ...typography.label,
    color: colors.primary.main,
    fontWeight: '600',
    textAlign: 'center',
  },
});
