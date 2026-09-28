import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
  type LayoutChangeEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackActions, useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import {
  getCategories,
  getListingById,
  createListing,
  updateListing,
  uploadListingPhotos,
  createListingSchema,
  buildListingFormInput,
  isSameListingForm,
  listingFieldErrors,
  userMessage,
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  MAX_PHOTOS_PER_LISTING,
  type MarketplaceCategory,
  type MarketplaceListing,
  type ListingFormFields,
  type ListingPhotoUploadInput,
  type ListingResult,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { useActiveMetro } from '../../hooks/useActiveMetro';
import { supabase } from '../../config/supabase';
import { ListingFormField } from '../../components/marketplace/ListingFormField';
import { ChoiceToggle } from '../../components/marketplace/ChoiceToggle';
import { MarketplaceErrorState } from '../../components/marketplace/MarketplaceErrorState';
import { ListingCategoryPicker } from '../../components/marketplace/ListingCategoryPicker';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { MarketplaceStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<MarketplaceStackParamList>;
type Route = RouteProp<MarketplaceStackParamList, 'CreateListing'>;

type NewPhoto = {
  uri: string;
  fileData: ArrayBuffer;
  mimeType: string;
  sizeBytes: number;
};

/** Where to go once saved: a new listing opens, an edit returns to its listing. */
type Saved = { kind: 'created'; listingId: string } | { kind: 'edited' };

// Most community sellers aren't businesses, so a new listing starts as Individual.
const EMPTY_FORM: ListingFormFields = {
  listing_type: 'individual',
  title: '',
  description: '',
  category_id: '',
  price: '',
  business_name: '',
  address: '',
  phone: '',
  email: '',
  website_url: '',
  item_condition: undefined,
};

/** The form's fields top to bottom; a failed submit scrolls to the first with an error. */
const FIELD_ORDER = [
  'category_id',
  'title',
  'description',
  'price',
  'business_name',
  'address',
  'website_url',
  'phone',
  'email',
] as const;
type FormField = (typeof FIELD_ORDER)[number];

const FORM_LOAD_FAILED = "Couldn't load the listing form.";
const LISTING_LOAD_FAILED = "Couldn't load this listing.";

/** Room left above a field scrolled to, so its label shows too. */
const SCROLL_MARGIN = spacing.m;

const TYPE_CHOICES = (['individual', 'business'] as const).map((value) => ({
  value,
  label: LISTING_TYPE_LABELS[value],
}));
const CONDITION_CHOICES = (['new', 'used'] as const).map((value) => ({
  value,
  label: ITEM_CONDITION_LABELS[value],
}));

function toFormFields(listing: MarketplaceListing): ListingFormFields {
  return {
    listing_type: listing.listing_type,
    title: listing.title,
    description: listing.description,
    category_id: listing.category_id,
    price: listing.price ?? '',
    business_name: listing.business_name ?? '',
    address: listing.address ?? '',
    phone: listing.phone ?? '',
    email: listing.email ?? '',
    website_url: listing.website_url ?? '',
    item_condition: listing.item_condition ?? undefined,
  };
}

function sameUrls(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((url, i) => url === b[i]);
}

export default function CreateListingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  // New listings go to the metro the member is looking at, as new posts do.
  const { metroAreaId } = useActiveMetro();

  const editListingId = route.params?.editListingId;
  const isEditing = !!editListingId;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<ListingFormFields>(EMPTY_FORM);
  // What the form started as (empty, or the listing being edited), to tell if it changed.
  const [initialForm, setInitialForm] = useState<ListingFormFields>(EMPTY_FORM);
  const [initialPhotoUrls, setInitialPhotoUrls] = useState<string[]>([]);

  // Photo state: existing remote URLs (edit mode) + newly picked local photos
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const fieldYRef = useRef<Partial<Record<FormField, number>>>({});
  const titleRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const businessNameRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const websiteRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  // A save carries on if the member leaves mid-way; once the screen is gone it
  // mustn't show alerts over wherever they went.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isBusiness = form.listing_type === 'business';
  const totalPhotos = existingPhotoUrls.length + newPhotos.length;
  const isDirty =
    !isSameListingForm(form, initialForm) ||
    newPhotos.length > 0 ||
    !sameUrls(existingPhotoUrls, initialPhotoUrls);

  // Swipe-down, ✕ and Android back all ask first while there is something to lose.
  usePreventRemove(isDirty && !submitting && !saved, ({ data }) => {
    Alert.alert(
      isEditing ? 'Discard your changes?' : 'Discard this listing?',
      isEditing
        ? "Your changes to this listing won't be saved."
        : "What you've entered won't be saved.",
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
      ]
    );
  });

  // Leaves once saved. This runs after usePreventRemove has stopped blocking,
  // so leaving doesn't ask to discard what was just saved.
  useEffect(() => {
    if (!saved) return;
    if (saved.kind === 'created') {
      navigation.dispatch(StackActions.replace('ListingDetail', { listingId: saved.listingId }));
    } else {
      navigation.goBack();
    }
  }, [saved, navigation]);

  useEffect(() => {
    let cancelled = false;
    const loadFailed = (error: unknown) =>
      userMessage(
        error,
        editListingId ? LISTING_LOAD_FAILED : FORM_LOAD_FAILED,
        'listing_form_load_failed',
        { platform: 'mobile', listingId: editListingId }
      );

    (async () => {
      try {
        const [catResult, editResult] = await Promise.all([
          getCategories(supabase),
          editListingId
            ? getListingById(supabase, editListingId)
            : Promise.resolve<ListingResult>({}),
        ]);

        if (cancelled) return;

        // Without categories no listing can be saved, and an edit form without
        // its listing would save blanks over the real one: say so instead.
        if (!catResult.data) {
          setLoadError(loadFailed(catResult.error));
          return;
        }
        if (editListingId && !editResult.data) {
          setLoadError(loadFailed(editResult.error));
          return;
        }

        setCategories(catResult.data);
        if (editResult.data) {
          const fields = toFormFields(editResult.data);
          const photos = editResult.data.photos ?? [];
          setForm(fields);
          setInitialForm(fields);
          setExistingPhotoUrls(photos);
          setInitialPhotoUrls(photos);
        }
      } catch (error) {
        if (!cancelled) setLoadError(loadFailed(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editListingId, loadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setLoadKey((key) => key + 1);
  }, []);

  const setField = useCallback(
    <K extends keyof ListingFormFields>(key: K, value: ListingFormFields[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const trackLayout = useCallback(
    (field: FormField) => (event: LayoutChangeEvent) => {
      fieldYRef.current[field] = event.nativeEvent.layout.y;
    },
    []
  );

  /**
   * Scrolls to the first field with an error and moves the screen reader there,
   * which reads the error as the field's hint. The category has no input to
   * move to, so its error is read out instead.
   */
  const revealFirstError = useCallback((fieldErrors: Record<string, string>) => {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (!first) return;
    const y = fieldYRef.current[first];
    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - SCROLL_MARGIN), animated: true });
    }
    const inputs: Partial<Record<FormField, React.RefObject<TextInput | null>>> = {
      title: titleRef,
      description: descriptionRef,
      price: priceRef,
      business_name: businessNameRef,
      address: addressRef,
      website_url: websiteRef,
      phone: phoneRef,
      email: emailRef,
    };
    const input = inputs[first]?.current;
    if (input) {
      AccessibilityInfo.sendAccessibilityEvent(input, 'focus');
    } else {
      AccessibilityInfo.announceForAccessibility(fieldErrors[first]);
    }
  }, []);

  const requestLibraryPermission = async (): Promise<boolean> => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!result.granted) {
      Alert.alert(
        'Photo Library Access Required',
        'Nepally needs photo library access to add listing photos. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  };

  const handleAddPhoto = useCallback(async () => {
    if (totalPhotos >= MAX_PHOTOS_PER_LISTING) {
      Alert.alert('Photo Limit', `You can add up to ${MAX_PHOTOS_PER_LISTING} photos per listing.`);
      return;
    }

    const granted = await requestLibraryPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS_PER_LISTING - totalPhotos,
      quality: 1,
    });

    if (result.canceled || !result.assets.length) return;

    setUploadingPhotos(true);
    const picked: NewPhoto[] = [];

    for (const asset of result.assets) {
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        const file = new File(manipulated.uri);
        const fileData = await file.arrayBuffer();
        picked.push({
          uri: manipulated.uri,
          fileData,
          mimeType: 'image/jpeg',
          sizeBytes: fileData.byteLength,
        });
      } catch {
        // Skip photos that fail to process
      }
    }

    setNewPhotos((prev) =>
      [...prev, ...picked].slice(0, MAX_PHOTOS_PER_LISTING - existingPhotoUrls.length)
    );
    setUploadingPhotos(false);
  }, [totalPhotos, existingPhotoUrls.length]);

  const handleRemoveExistingPhoto = useCallback((index: number) => {
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveNewPhoto = useCallback((index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user || !metroAreaId) return;

    // The type not selected sends nothing for its fields, and the website gets https://.
    const input = buildListingFormInput(form);
    const validation = createListingSchema.safeParse({ ...input, photos: [] });
    if (!validation.success) {
      const fieldErrors = listingFieldErrors(validation.error.issues);
      setErrors(fieldErrors);
      revealFirstError(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);

    // Upload any new photos first
    let allPhotoUrls = [...existingPhotoUrls];
    if (newPhotos.length > 0) {
      const uploadInputs: ListingPhotoUploadInput[] = newPhotos.map((p) => ({
        user_id: user.id,
        file_data: p.fileData,
        mime_type: p.mimeType,
        size_bytes: p.sizeBytes,
      }));
      const uploadResult = await uploadListingPhotos(supabase, uploadInputs);
      if (uploadResult.error) {
        if (!mountedRef.current) return;
        Alert.alert('Upload Failed', uploadResult.error.message);
        setSubmitting(false);
        return;
      }
      allPhotoUrls = [...allPhotoUrls, ...(uploadResult.urls ?? [])];
    }

    const payload = { ...input, photos: allPhotoUrls };
    const result =
      isEditing && editListingId
        ? await updateListing(supabase, editListingId, payload)
        : await createListing(supabase, {
            ...payload,
            owner_id: user.id,
            metro_area_id: metroAreaId,
          });

    if (!mountedRef.current) return;
    setSubmitting(false);
    if (result.error || !result.data) {
      Alert.alert(
        'Error',
        result.error?.message ?? "Couldn't save your listing. Please try again."
      );
      return;
    }
    setSaved(isEditing ? { kind: 'edited' } : { kind: 'created', listingId: result.data.id });
  }, [
    user,
    metroAreaId,
    form,
    existingPhotoUrls,
    newPhotos,
    isEditing,
    editListingId,
    revealFirstError,
  ]);

  // The member can always close the form, even while it loads or after it fails to.
  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={8}
      >
        <Ionicons name="close" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {isEditing ? 'Edit Listing' : 'Create Listing'}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (loading || loadError) {
    return (
      <SafeAreaView style={styles.container}>
        {header}
        {loadError ? (
          <MarketplaceErrorState message={loadError} onRetry={reload} />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const submitLabel = isEditing ? 'Update Listing' : 'Create Listing';

  return (
    <SafeAreaView style={styles.container}>
      {header}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Listing Type Toggle */}
          <View style={styles.section}>
            <Text style={styles.label}>Listing Type</Text>
            <ChoiceToggle
              accessibilityLabel="Listing type"
              choices={TYPE_CHOICES}
              selected={form.listing_type}
              onSelect={(value) => setField('listing_type', value)}
            />
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.label}>Photos (up to {MAX_PHOTOS_PER_LISTING})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {/* Existing photos (edit mode) */}
              {existingPhotoUrls.map((url, index) => (
                <View key={`existing-${index}`} style={styles.photoThumb}>
                  <Image source={url} style={styles.photoThumbImage} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => handleRemoveExistingPhoto(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              {/* Newly picked photos */}
              {newPhotos.map((photo, index) => (
                <View key={`new-${index}`} style={styles.photoThumb}>
                  <Image source={photo.uri} style={styles.photoThumbImage} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.photoRemoveBtn}
                    onPress={() => handleRemoveNewPhoto(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ))}
              {/* Add photo button */}
              {totalPhotos < MAX_PHOTOS_PER_LISTING && (
                <TouchableOpacity
                  style={styles.addPhotoBtn}
                  onPress={handleAddPhoto}
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? (
                    <ActivityIndicator color={colors.primary.main} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={24} color={colors.primary.main} />
                      <Text style={styles.addPhotoBtnText}>Add Photo</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
            <Text style={styles.photoHint}>
              {totalPhotos}/{MAX_PHOTOS_PER_LISTING} photos added
            </Text>
          </View>

          <ListingCategoryPicker
            categories={categories}
            selectedId={form.category_id}
            onSelect={(categoryId) => setField('category_id', categoryId)}
            error={errors.category_id}
            onSectionLayout={trackLayout('category_id')}
          />

          <ListingFormField
            ref={titleRef}
            label="Title"
            required
            error={errors.title}
            onSectionLayout={trackLayout('title')}
            placeholder="What are you listing?"
            value={form.title}
            onChangeText={(value) => setField('title', value)}
            maxLength={150}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => descriptionRef.current?.focus()}
          />

          <ListingFormField
            ref={descriptionRef}
            label="Description"
            required
            error={errors.description}
            onSectionLayout={trackLayout('description')}
            placeholder="Describe your listing in detail..."
            value={form.description}
            onChangeText={(value) => setField('description', value)}
            multiline
            numberOfLines={4}
            maxLength={3000}
            textAlignVertical="top"
          />

          <ListingFormField
            ref={priceRef}
            label="Price / Rate"
            error={errors.price}
            onSectionLayout={trackLayout('price')}
            placeholder='e.g., "$50/hr", "Free", "Contact for pricing"'
            value={form.price}
            onChangeText={(value) => setField('price', value)}
            maxLength={50}
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => (isBusiness ? businessNameRef : phoneRef).current?.focus()}
          />

          {/* Business-specific fields */}
          {isBusiness ? (
            <>
              <ListingFormField
                ref={businessNameRef}
                label="Business name"
                required
                error={errors.business_name}
                onSectionLayout={trackLayout('business_name')}
                placeholder="Your business name"
                value={form.business_name}
                onChangeText={(value) => setField('business_name', value)}
                maxLength={100}
                textContentType="organizationName"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => addressRef.current?.focus()}
              />

              <ListingFormField
                ref={addressRef}
                label="Address"
                error={errors.address}
                onSectionLayout={trackLayout('address')}
                placeholder="Business address"
                value={form.address}
                onChangeText={(value) => setField('address', value)}
                maxLength={200}
                autoComplete="street-address"
                textContentType="fullStreetAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => websiteRef.current?.focus()}
              />

              <ListingFormField
                ref={websiteRef}
                label="Website"
                error={errors.website_url}
                onSectionLayout={trackLayout('website_url')}
                placeholder="https://..."
                value={form.website_url}
                onChangeText={(value) => setField('website_url', value)}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="url"
                textContentType="URL"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            </>
          ) : (
            <View style={styles.section}>
              <Text style={styles.label}>Condition</Text>
              <ChoiceToggle
                accessibilityLabel="Condition"
                choices={CONDITION_CHOICES}
                selected={form.item_condition}
                onSelect={(value) => setField('item_condition', value)}
              />
            </View>
          )}

          {/* Contact Info */}
          <ListingFormField
            ref={phoneRef}
            label="Phone"
            error={errors.phone}
            onSectionLayout={trackLayout('phone')}
            placeholder="Contact phone number"
            value={form.phone}
            onChangeText={(value) => setField('phone', value)}
            maxLength={20}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => emailRef.current?.focus()}
          />

          <ListingFormField
            ref={emailRef}
            label="Email"
            error={errors.email}
            onSectionLayout={trackLayout('email')}
            placeholder="Contact email"
            value={form.email}
            onChangeText={(value) => setField('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="done"
          />

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel={submitLabel}
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>{submitLabel}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  scrollContent: {
    padding: spacing.m,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.m,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  photoStrip: {
    flexGrow: 0,
  },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.input,
    marginRight: spacing.s,
    position: 'relative',
    overflow: 'visible',
  },
  photoThumbImage: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.input,
    resizeMode: 'cover',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.text.primary,
    borderRadius: 10,
  },
  addPhotoBtn: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.primary.main,
    borderStyle: 'dashed',
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.s,
    gap: 4,
  },
  addPhotoBtnText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  photoHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.input,
    paddingVertical: spacing.m,
    alignItems: 'center',
    marginTop: spacing.m,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});
