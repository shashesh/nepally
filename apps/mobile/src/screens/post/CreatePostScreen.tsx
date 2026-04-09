import React, { useLayoutEffect, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PostStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
import {
  createPost,
  getPostById,
  updatePost,
  deletePostPhotos,
  getPostPhotoPathFromUrl,
  getTags,
  MAX_POST_PHOTO_BYTES,
  TAG_EMOJI,
  TAG_COLORS,
  DEFAULT_TAG_COLOR,
  MAX_TAGS_PER_POST,
  MAX_PHOTOS_PER_POST,
  uploadPostPhotos,
} from '@nepally/shared';
import type { Tag } from '@nepally/shared';
import { supabase } from '../../config/supabase';
import { savePostDraft, loadPostDraft, clearPostDraft } from '../../utils/storage';
import type { PostDraft } from '../../utils/storage';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';

type Props = NativeStackScreenProps<PostStackParamList, 'CreatePost'>;

const TITLE_MAX = 150;
const TITLE_COUNTER_THRESHOLD = 120;
const BODY_MAX = 5000;
const BODY_COUNTER_THRESHOLD = 4500;

type SelectedPhoto = {
  id: string;
  uri: string;
  mime_type: string;
  size_bytes: number;
  file_name?: string;
};

type EditablePhoto =
  | { kind: 'existing'; existing_url: string }
  | { kind: 'new'; photo: SelectedPhoto };

export default function CreatePostScreen({ navigation, route }: Props) {
  const editPostId = route.params?.editPostId;
  const isEditing = typeof editPostId === 'string' && editPostId.length > 0;
  const { user } = useAuth();
  const { activeLocation } = useLocation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [removedExistingPhotoPaths, setRemovedExistingPhotoPaths] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  // Ref to always have current selectedPhotos in handleSubmit, avoiding stale closure
  // through the navigation header's useLayoutEffect
  const selectedPhotosRef = useRef<SelectedPhoto[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);
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

  // Keep ref in sync so handleSubmit always reads the latest photos
  selectedPhotosRef.current = selectedPhotos;

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
    : user?.metro_area_id
      ? 'Your local area'
      : null;

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    if (!isEditing || !editPostId || availableTags.length === 0) return;
    loadExistingPost(editPostId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editPostId, availableTags.length]);

  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save draft for new posts (not edits)
  useEffect(() => {
    if (isEditing) return;
    if (!title && !body && selectedTagIds.length === 0) return; // nothing to save

    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      savePostDraft({
        title,
        body,
        selectedTagIds,
        isGlobal,
        savedAt: new Date().toISOString(),
      });
    }, 500);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [title, body, selectedTagIds, isGlobal, isEditing]);

  // Offer draft recovery on mount for new posts
  useEffect(() => {
    if (isEditing) return;
    loadPostDraft().then((draft: PostDraft | null) => {
      if (!draft) return;
      if (!draft.title && !draft.body && draft.selectedTagIds.length === 0) return;
      Alert.alert(
        'Restore Draft?',
        'You have an unsaved post from a previous session. Would you like to restore it?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => clearPostDraft(),
          },
          {
            text: 'Restore',
            onPress: () => {
              setTitle(draft.title);
              setBody(draft.body);
              setSelectedTagIds(draft.selectedTagIds);
              setIsGlobal(draft.isGlobal);
            },
          },
        ]
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitleAlign: 'center',
      headerTitleStyle: {
        fontSize: 16,
        fontWeight: '600',
      },
      headerLeft: () => (
        <View style={headerStyles.sideContainer}>
          <TouchableOpacity onPress={handleCancel} hitSlop={8}>
            <Text style={headerStyles.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ),
      headerRight: () => (
        <View style={[headerStyles.sideContainer, headerStyles.sideContainerRight]}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={[headerStyles.postBtn, !canSubmit && headerStyles.postBtnDisabled]}
            hitSlop={8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text
                style={[headerStyles.postBtnText, !canSubmit && headerStyles.postBtnTextDisabled]}
              >
                {isEditing ? 'Save' : 'Post'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ),
      title: isEditing ? 'Edit Post' : 'Create Post',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canSubmit,
    submitting,
    isDirty,
    title,
    body,
    selectedTagIds,
    tagsLoading,
    loadingExistingPost,
    isEditing,
  ]);

  async function loadTags() {
    setTagsLoading(true);
    setTagsError(null);
    const result = await getTags(supabase);
    if (result.data) {
      setAvailableTags(result.data);
    } else {
      setTagsError('Unable to load tags. Pull to refresh or reopen this screen.');
    }
    setTagsLoading(false);
  }

  async function loadExistingPost(postId: string) {
    setLoadingExistingPost(true);
    const result = await getPostById(supabase, postId);

    if (!result.data) {
      Alert.alert('Error', result.error?.message || 'Unable to load post for editing.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setLoadingExistingPost(false);
      return;
    }

    if (user?.id && result.data.author_id !== user.id) {
      Alert.alert('Not Allowed', 'You can only edit your own posts.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setLoadingExistingPost(false);
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
    setLoadingExistingPost(false);
  }

  function handleCancel() {
    if (isDirty) {
      Alert.alert('Discard Post?', 'You have unsaved changes. Are you sure you want to discard this post?', [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            if (!isEditing) {
              clearPostDraft();
            }
            navigation.goBack();
          },
        },
      ]);
    } else {
      navigation.goBack();
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      if (prev.length >= MAX_TAGS_PER_POST) return prev;
      return [...prev, tagId];
    });
  }

  async function requestPhotoLibraryPermission(): Promise<boolean> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.granted) return true;

    Alert.alert(
      'Photo Library Access Required',
      'Nepally needs photo library access so you can attach images to your post.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  async function handlePickPhotos() {
    const currentPhotoCount = existingPhotos.length + selectedPhotos.length;
    if (currentPhotoCount >= MAX_PHOTOS_PER_POST) {
      Alert.alert('Photo Limit Reached', `You can upload up to ${MAX_PHOTOS_PER_POST} photos per post.`);
      return;
    }

    const hasPermission = await requestPhotoLibraryPermission();
    if (!hasPermission) return;

    const remaining = MAX_PHOTOS_PER_POST - currentPhotoCount;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) return;

    const nextPhotos: SelectedPhoto[] = [];
    for (const asset of result.assets) {
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileName = asset.fileName || undefined;

      // Only validate mime type at pick time — size is validated at upload
      // (asset.fileSize is unreliable on some devices/OS versions)
      const allowedMimeTypes: string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(mimeType)) {
        Alert.alert('Invalid Photo', 'Unsupported image type. Allowed: JPG, PNG, WEBP');
        return;
      }

      nextPhotos.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        uri: asset.uri,
        mime_type: mimeType,
        size_bytes: asset.fileSize ?? 0,
        file_name: fileName,
      });
    }

    setSelectedPhotos((prev) => {
      const merged = [...prev, ...nextPhotos];
      return merged.slice(0, MAX_PHOTOS_PER_POST);
    });
  }

  function handleRemovePhoto(photoId: string) {
    setSelectedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  }

  function handleRemoveExistingPhoto(photoUrl: string) {
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

  async function handleSubmit() {
    if (!canSubmit || !user) return;

    if (isEditing && editPostId) {
      setSubmitting(true);
      let uploadedPhotoPaths: string[] = [];
      try {
        const combinedPhotos = getCombinedEditablePhotos();
        let newPhotoUrls: string[] = [];
        const uploadedUrlByPhotoId = new Map<string, string>();
        const photosToUpload = selectedPhotosRef.current;
        if (photosToUpload.length > 0) {
          const uploadInputs = await Promise.all(
            photosToUpload.map(async (photo) => {
              const base64 = await FileSystem.readAsStringAsync(photo.uri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const binaryStr = atob(base64);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
              }
              return {
                user_id: user.id,
                file_data: bytes.buffer as ArrayBuffer,
                mime_type: photo.mime_type,
                size_bytes: bytes.length,
                file_name: photo.file_name,
              };
            })
          );

          const uploadResult = await uploadPostPhotos(supabase, uploadInputs);
          if (uploadResult.error || !uploadResult.urls) {
            Alert.alert('Upload Error', 'Failed to upload photos. Please try again.');
            return;
          }

          newPhotoUrls = uploadResult.urls;
          uploadedPhotoPaths = uploadResult.paths || [];
          photosToUpload.forEach((photo, index) => {
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
          Alert.alert('Error', 'Could not save post. Please try again.');
          return;
        }

        if (removedExistingPhotoPaths.length > 0) {
          await deletePostPhotos(supabase, removedExistingPhotoPaths);
        }

        Alert.alert('Post Updated', 'Your post has been updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } catch {
        Alert.alert('Error', 'Could not update post. Please check your connection and try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const metroAreaId = activeLocation?.metro_area_id ?? user.metro_area_id;
    if (!metroAreaId || !user.zip_code) {
      Alert.alert('Location Required', 'Please complete onboarding with a valid ZIP code before posting.');
      return;
    }

    // Level 0 check
    if (user.trust_level < 1) {
      Alert.alert('Verify to Post', 'Please verify your phone number to create posts.');
      return;
    }

    setSubmitting(true);
    let uploadedPhotoPaths: string[] = [];
    try {
      const cityName = activeLocation?.metro_name?.split('-')[0]?.trim() || 'Unknown';
      const stateName = activeLocation?.metro_state || 'Unknown';

      let photoUrls: string[] = [];
      const photosToUpload = selectedPhotosRef.current;
      if (photosToUpload.length > 0) {
        const uploadInputs = await Promise.all(
          photosToUpload.map(async (photo) => {
            // Use expo-file-system legacy API — reliable for file:// URIs on iOS/Android
            const base64 = await FileSystem.readAsStringAsync(photo.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            return {
              user_id: user.id,
              file_data: bytes.buffer as ArrayBuffer,
              mime_type: photo.mime_type,
              size_bytes: bytes.length,
              file_name: photo.file_name,
            };
          })
        );

        const uploadResult = await uploadPostPhotos(supabase, uploadInputs);
        if (uploadResult.error || !uploadResult.urls) {
          Alert.alert('Upload Error', 'Failed to upload photos. Please try again.');
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
        Alert.alert('Error', 'Could not save post. Please try again.');
        return;
      }

      if (requiresModeration) {
        Alert.alert(
          'Submitted for Review',
          'Your emergency post has been submitted for moderator review.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        clearPostDraft();
        Alert.alert('Post Published!', 'Your post is now live.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('Error', 'Could not create post. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
        >
          {/* Title Input */}
          <View style={styles.formCard}>
            <View style={styles.titleSection}>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="What's this about?"
              placeholderTextColor="#9E9E9E"
              maxLength={TITLE_MAX}
              accessibilityLabel="Post title, required"
              accessibilityHint="Enter a title for your post"
              testID="post-title-input"
            />
            {title.length >= TITLE_COUNTER_THRESHOLD && (
              <Text
                style={[
                  styles.charCounter,
                  title.length >= 140 && styles.charCounterWarning,
                ]}
              >
                {title.length}/{TITLE_MAX}
              </Text>
            )}
            {!titleValid && title.length > 0 && (
              <Text style={styles.inlineError}>Title must be at least 5 characters</Text>
            )}
            </View>

            {/* Body Textarea */}
            <View style={styles.bodySection}>
              <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder="Write your post details here..."
              placeholderTextColor="#9E9E9E"
              multiline
              textAlignVertical="top"
              maxLength={BODY_MAX}
              accessibilityLabel="Post body, required"
              accessibilityHint="Enter the details of your post"
              testID="post-body-input"
            />
            {body.length >= BODY_COUNTER_THRESHOLD && (
              <Text
                style={[
                  styles.charCounter,
                  body.length >= 4800 && styles.charCounterWarning,
                ]}
              >
                {body.length}/{BODY_MAX}
              </Text>
            )}
              {!bodyValid && body.length > 0 && (
                <Text style={styles.inlineError}>Body must be at least 10 characters</Text>
              )}
            </View>
          </View>

          {/* Tag Selection */}
          <View style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>Tags (1-3 required)</Text>
              <Text style={styles.sectionHint}>{selectedTagIds.length}/{MAX_TAGS_PER_POST}</Text>
            </View>

            {tagsError && <Text style={styles.inlineError}>{tagsError}</Text>}

            <View style={styles.tagGrid}>
              {availableTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const tagColor = tag.color || TAG_COLORS[tag.slug] || DEFAULT_TAG_COLOR;
                const emoji = TAG_EMOJI[tag.slug] || '';
                const isDisabled = !isSelected && selectedTagIds.length >= MAX_TAGS_PER_POST;

                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagChip,
                      isSelected && {
                        backgroundColor: `${tagColor}26`,
                        borderColor: tagColor,
                        borderWidth: 2,
                      },
                      isDisabled && styles.tagChipDisabled,
                    ]}
                    onPress={() => toggleTag(tag.id)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                    accessibilityLabel={`${tag.name} tag, ${isSelected ? 'selected' : 'not selected'}`}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.tagChipText,
                        isSelected && { color: tagColor, fontWeight: '600' },
                        isDisabled && styles.tagChipTextDisabled,
                      ]}
                    >
                      {emoji ? `${emoji} ${tag.name}` : tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {!tagsValid && !tagsLoading && (
              <Text style={styles.inlineError}>Please select at least 1 tag</Text>
            )}

            {/* Emergency Warning */}
            {hasEmergencyTag && (
              <View style={styles.emergencyWarning}>
                <Text style={styles.emergencyWarningText}>
                  Emergency posts require moderator approval before becoming visible. This is NOT a replacement for 911.
                </Text>
              </View>
            )}
          </View>

          {/* Photo Attachment */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.photoRow}
              onPress={handlePickPhotos}
              disabled={submitting || existingPhotos.length + selectedPhotos.length >= MAX_PHOTOS_PER_POST}
              activeOpacity={0.7}
              accessibilityLabel={`Add photos, optional. ${existingPhotos.length + selectedPhotos.length} of ${MAX_PHOTOS_PER_POST} photos added.`}
            >
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoLabel}>Add Photos (optional)</Text>
              <Text style={styles.photoCount}>{existingPhotos.length + selectedPhotos.length}/{MAX_PHOTOS_PER_POST}</Text>
            </TouchableOpacity>
            <Text style={styles.optionalHint}>Photos are optional and not required to publish.</Text>
            <Text style={styles.optionalHint}>Allowed: JPG, PNG, WEBP up to {Math.round(MAX_POST_PHOTO_BYTES / (1024 * 1024))}MB each.</Text>

            {(existingPhotos.length > 0 || selectedPhotos.length > 0) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoPreviewRow}>
                {getCombinedEditablePhotos().map((photo, index, arr) => {
                  const isExisting = photo.kind === 'existing';
                  const photoUrl = isExisting ? photo.existing_url : photo.photo.uri;

                  return (
                    <View key={`${isExisting ? 'existing' : 'new'}-${photoUrl}-${index}`} style={styles.photoPreviewItem}>
                      <Image source={photoUrl} style={styles.photoPreviewImage} contentFit="cover" />
                      <TouchableOpacity
                        style={styles.photoRemoveButton}
                        onPress={() => {
                          if (isExisting) {
                            handleRemoveExistingPhoto(photo.existing_url);
                          } else {
                            handleRemovePhoto(photo.photo.id);
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove photo ${index + 1}`}
                      >
                        <Text style={styles.photoRemoveButtonText}>✕</Text>
                      </TouchableOpacity>

                      {isEditing && arr.length > 1 && (
                        <View style={styles.photoReorderControls}>
                          <TouchableOpacity
                            style={[styles.photoReorderButton, index === 0 && styles.photoReorderButtonDisabled]}
                            disabled={index === 0}
                            onPress={() => movePhotoAtIndex(index, -1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Move photo ${index + 1} left`}
                          >
                            <Text style={styles.photoReorderButtonText}>←</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.photoReorderButton,
                              index === arr.length - 1 && styles.photoReorderButtonDisabled,
                            ]}
                            disabled={index === arr.length - 1}
                            onPress={() => movePhotoAtIndex(index, 1)}
                            accessibilityRole="button"
                            accessibilityLabel={`Move photo ${index + 1} right`}
                          >
                            <Text style={styles.photoReorderButtonText}>→</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {isEditing && existingPhotos.length + selectedPhotos.length > 1 && (
              <Text style={styles.optionalHint}>Reorder photos using ← and → controls on each thumbnail.</Text>
            )}
          </View>

          {/* Location Info */}
          {metroName && (
            <View style={styles.locationRow}>
              <Text style={styles.locationText}>📍 Posting to: {metroName}</Text>
            </View>
          )}

          {/* Global Toggle (Premium Only) */}
          {user?.is_premium && (
            <View style={styles.globalRow}>
              <View style={styles.globalInfo}>
                <Text style={styles.globalLabel}>🌐 Post Globally</Text>
                <Text style={styles.globalSublabel}>Visible in all metro areas</Text>
              </View>
              <Switch
                value={isGlobal}
                onValueChange={setIsGlobal}
                trackColor={{ false: '#E0E0E0', true: colors.primary.main }}
                thumbColor={colors.white}
                accessibilityLabel="Post globally toggle"
                accessibilityHint="When on, your post will be visible in all metro areas"
              />
            </View>
          )}

          {postButtonHint && (
            <Text style={styles.submitHint}>{postButtonHint}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  sideContainer: {
    minWidth: 84,
    justifyContent: 'center',
  },
  sideContainerRight: {
    alignItems: 'flex-end',
  },
  cancel: {
    fontSize: 17,
    color: colors.primary.main,
    paddingHorizontal: spacing.xs,
  },
  postBtn: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  postBtnDisabled: {
    backgroundColor: '#F5F5F5',
  },
  postBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  postBtnTextDisabled: {
    color: '#BDBDBD',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  flex1: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.s,
    paddingTop: spacing.s,
    paddingBottom: spacing.xl,
    gap: spacing.s,
  },
  formCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
    overflow: 'hidden',
  },
  titleSection: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  titleInput: {
    ...typography.h3,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bodySection: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 120,
  },
  bodyInput: {
    ...typography.body,
    color: colors.text.primary,
    minHeight: 100,
  },
  charCounter: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
    marginTop: spacing.xxs,
  },
  charCounterWarning: {
    color: colors.error,
  },
  section: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.s,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  inlineError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xxs,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagChipDisabled: {
    opacity: 0.5,
  },
  tagChipText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  tagChipTextDisabled: {
    color: '#BDBDBD',
  },
  emergencyWarning: {
    backgroundColor: '#FFEBEE',
    padding: spacing.xs,
    borderRadius: borderRadius.input,
    marginTop: spacing.xs,
  },
  emergencyWarningText: {
    fontSize: 12,
    color: colors.error,
    lineHeight: 18,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  photoIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  photoLabel: {
    fontSize: 15,
    color: colors.text.secondary,
    flex: 1,
  },
  photoCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  optionalHint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xxs,
  },
  photoPreviewRow: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  photoPreviewItem: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.input,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  photoReorderControls: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  photoReorderButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoReorderButtonDisabled: {
    opacity: 0.35,
  },
  photoReorderButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
  locationRow: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
  },
  locationText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.card,
  },
  globalInfo: {
    flex: 1,
  },
  globalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
  },
  globalSublabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  submitHint: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
