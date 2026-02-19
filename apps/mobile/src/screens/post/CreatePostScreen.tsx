import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PostStackParamList } from '../../types/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';
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
import { supabase } from '../../config/supabase';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';

type Props = NativeStackScreenProps<PostStackParamList, 'CreatePost'>;

const TITLE_MAX = 150;
const TITLE_COUNTER_THRESHOLD = 120;
const BODY_MAX = 5000;
const BODY_COUNTER_THRESHOLD = 4500;

export default function CreatePostScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { activeLocation } = useLocation();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    : user?.metro_area_id
      ? 'Your local area'
      : null;

  useEffect(() => {
    loadTags();
  }, []);

  // Custom header
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleCancel} hitSlop={8}>
          <Text style={headerStyles.cancel}>Cancel</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!isFormValid}
          style={[headerStyles.postBtn, !isFormValid && headerStyles.postBtnDisabled]}
          hitSlop={8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text
              style={[headerStyles.postBtnText, !isFormValid && headerStyles.postBtnTextDisabled]}
            >
              Post
            </Text>
          )}
        </TouchableOpacity>
      ),
      title: 'Create Post',
    });
  }, [isFormValid, submitting, isDirty, title, body, selectedTagIds]);

  async function loadTags() {
    const result = await getTags(supabase);
    if (result.data) setAvailableTags(result.data);
  }

  function handleCancel() {
    if (isDirty) {
      Alert.alert('Discard Post?', 'You have unsaved changes. Are you sure you want to discard this post?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
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

  async function handleSubmit() {
    if (!isFormValid || !user) return;

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
        Alert.alert('Error', result.error.message);
        return;
      }

      if (requiresModeration) {
        Alert.alert(
          'Submitted for Review',
          'Your emergency post has been submitted for moderator review.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
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
          </View>

          {/* Tag Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags (1-3 required)</Text>
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
              activeOpacity={0.7}
              accessibilityLabel={`Add photos, optional. 0 of ${MAX_PHOTOS_PER_POST} photos added.`}
            >
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoLabel}>Add Photos (optional)</Text>
              <Text style={styles.photoCount}>0/{MAX_PHOTOS_PER_POST}</Text>
            </TouchableOpacity>
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const headerStyles = StyleSheet.create({
  cancel: {
    fontSize: 17,
    color: colors.primary.main,
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
    paddingBottom: spacing.xl,
  },
  titleSection: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  bodySection: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    minHeight: 120,
  },
  bodyInput: {
    fontSize: 16,
    color: '#212121',
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
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
    marginBottom: spacing.s,
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
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagChipDisabled: {
    opacity: 0.5,
  },
  tagChipText: {
    fontSize: 14,
    color: '#757575',
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
    color: '#757575',
    flex: 1,
  },
  photoCount: {
    fontSize: 14,
    color: '#757575',
  },
  locationRow: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  locationText: {
    fontSize: 14,
    color: '#757575',
  },
  globalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  globalInfo: {
    flex: 1,
  },
  globalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121',
  },
  globalSublabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
});
