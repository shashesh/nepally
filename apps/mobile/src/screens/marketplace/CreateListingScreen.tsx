import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  LISTING_TYPE_LABELS,
  ITEM_CONDITION_LABELS,
  MAX_PHOTOS_PER_LISTING,
  type MarketplaceCategory,
  type ListingType,
  type ItemCondition,
  type ListingPhotoUploadInput,
} from '@nepally/shared';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../config/supabase';
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

export default function CreateListingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { user } = useAuth();

  const editListingId = route.params?.editListingId;
  const isEditing = !!editListingId;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Photo state: existing remote URLs (edit mode) + newly picked local photos
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Form state
  const [listingType, setListingType] = useState<ListingType>('business');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [itemCondition, setItemCondition] = useState<ItemCondition | undefined>();

  const totalPhotos = existingPhotoUrls.length + newPhotos.length;

  useEffect(() => {
    async function init() {
      try {
        const catResult = await getCategories(supabase);
        if (catResult.data) setCategories(catResult.data);

        if (editListingId) {
          const result = await getListingById(supabase, editListingId);
          if (result.data) {
            const l = result.data;
            setListingType(l.listing_type);
            setTitle(l.title);
            setDescription(l.description);
            setCategoryId(l.category_id);
            setPrice(l.price ?? '');
            setBusinessName(l.business_name ?? '');
            setAddress(l.address ?? '');
            setPhone(l.phone ?? '');
            setEmail(l.email ?? '');
            setWebsiteUrl(l.website_url ?? '');
            setItemCondition(l.item_condition ?? undefined);
            setExistingPhotoUrls(l.photos ?? []);
          }
        }
      } catch {
        // Silently handle — empty categories / missing listing will
        // surface in the UI naturally.
      } finally {
        if (editListingId) setLoading(false);
      }
    }
    init();
  }, [editListingId]);

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

    setNewPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS_PER_LISTING - existingPhotoUrls.length));
    setUploadingPhotos(false);
  }, [totalPhotos, existingPhotoUrls.length]);

  const handleRemoveExistingPhoto = useCallback((index: number) => {
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveNewPhoto = useCallback((index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.metro_area_id) return;

    setErrors({});

    const formData = {
      listing_type: listingType,
      title,
      description,
      category_id: categoryId,
      photos: [] as string[], // placeholder — replaced after upload
      price: price || undefined,
      business_name: businessName || undefined,
      address: address || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website_url: websiteUrl || undefined,
      item_condition: itemCondition,
    };

    const validation = createListingSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0]?.toString() ?? 'form';
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

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
        Alert.alert('Upload Failed', uploadResult.error.message);
        setSubmitting(false);
        return;
      }
      allPhotoUrls = [...allPhotoUrls, ...(uploadResult.urls ?? [])];
    }

    const payload = { ...formData, photos: allPhotoUrls };

    if (isEditing && editListingId) {
      const result = await updateListing(supabase, editListingId, payload);
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        navigation.goBack();
      }
    } else {
      const result = await createListing(supabase, {
        ...payload,
        owner_id: user.id,
        metro_area_id: user.metro_area_id,
      });
      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        navigation.goBack();
      }
    }

    setSubmitting(false);
  }, [
    user, listingType, title, description, categoryId, price,
    businessName, address, phone, email, websiteUrl, itemCondition,
    existingPhotoUrls, newPhotos, isEditing, editListingId, navigation,
  ]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Listing' : 'Create Listing'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Listing Type Toggle */}
        <View style={styles.section}>
          <Text style={styles.label}>Listing Type</Text>
          <View style={styles.toggleRow}>
            {(['business', 'individual'] as ListingType[]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.toggleButton, listingType === type && styles.toggleButtonActive]}
                onPress={() => setListingType(type)}
              >
                <Text
                  style={[styles.toggleText, listingType === type && styles.toggleTextActive]}
                >
                  {LISTING_TYPE_LABELS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.label}>Photos (up to {MAX_PHOTOS_PER_LISTING})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
            {/* Existing photos (edit mode) */}
            {existingPhotoUrls.map((url, index) => (
              <View key={`existing-${index}`} style={styles.photoThumb}>
                <Image source={{ uri: url }} style={styles.photoThumbImage} />
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
                <Image source={{ uri: photo.uri }} style={styles.photoThumbImage} />
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
          <Text style={styles.photoHint}>{totalPhotos}/{MAX_PHOTOS_PER_LISTING} photos added</Text>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  categoryId === cat.id && styles.categoryChipActive,
                  categoryId === cat.id && { backgroundColor: (cat.color ?? '#9E9E9E') + '20' },
                ]}
                onPress={() => setCategoryId(cat.id)}
              >
                <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    categoryId === cat.id && { color: cat.color ?? colors.primary.main },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.category_id && <Text style={styles.errorText}>{errors.category_id}</Text>}
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="What are you listing?"
            placeholderTextColor={colors.text.tertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={150}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea, errors.description && styles.inputError]}
            placeholder="Describe your listing in detail..."
            placeholderTextColor={colors.text.tertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={3000}
            textAlignVertical="top"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.label}>Price / Rate (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder='e.g., "$50/hr", "Free", "Contact for pricing"'
            placeholderTextColor={colors.text.tertiary}
            value={price}
            onChangeText={setPrice}
          />
        </View>

        {/* Business-specific fields */}
        {listingType === 'business' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={[styles.input, errors.business_name && styles.inputError]}
                placeholder="Your business name"
                placeholderTextColor={colors.text.tertiary}
                value={businessName}
                onChangeText={setBusinessName}
              />
              {errors.business_name && <Text style={styles.errorText}>{errors.business_name}</Text>}
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Address (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Business address"
                placeholderTextColor={colors.text.tertiary}
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Website (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor={colors.text.tertiary}
                value={websiteUrl}
                onChangeText={setWebsiteUrl}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </>
        )}

        {/* Individual-specific fields */}
        {listingType === 'individual' && (
          <View style={styles.section}>
            <Text style={styles.label}>Condition</Text>
            <View style={styles.toggleRow}>
              {(['new', 'used'] as ItemCondition[]).map((condition) => (
                <TouchableOpacity
                  key={condition}
                  style={[styles.toggleButton, itemCondition === condition && styles.toggleButtonActive]}
                  onPress={() => setItemCondition(condition)}
                >
                  <Text
                    style={[styles.toggleText, itemCondition === condition && styles.toggleTextActive]}
                  >
                    {ITEM_CONDITION_LABELS[condition]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Contact phone number"
            placeholderTextColor={colors.text.tertiary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Contact email"
            placeholderTextColor={colors.text.tertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Update Listing' : 'Create Listing'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    ...typography.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  toggleButtonActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.light,
  },
  toggleText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
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
  categoryScroll: {
    flexGrow: 0,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.s,
    gap: spacing.xs,
  },
  categoryChipActive: {
    borderColor: colors.primary.main,
  },
  categoryChipEmoji: {
    fontSize: 16,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.text.secondary,
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
