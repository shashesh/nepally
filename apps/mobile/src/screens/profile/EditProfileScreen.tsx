import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { useAuth } from '../../hooks/useAuth';
import { useMetroArea } from '../../hooks/useMetroArea';
import {
  updateUserProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  APP_CONFIG,
  BIO_MAX_LENGTH,
  bioSchema,
} from '@nepally/shared';
import { saveMetroArea } from '../../utils/storage';
import { supabase } from '../../config/supabase';
import { AboutYouSection, type AboutYouValues } from './components/AboutYouSection';
import { Avatar } from '../../components/Avatar';
import { PrimaryButton } from '../../components/buttons/PrimaryButton';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing, borderRadius } from '../../styles/spacing';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function EditProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { fetchMetroByZip, updateLocation, loading: metroLoading } = useMetroArea();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [zipCode, setZipCode] = useState(user?.zip_code || '');
  const [metroName, setMetroName] = useState<string | null>(null);
  const [resolvedMetroId, setResolvedMetroId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aboutYou, setAboutYou] = useState<AboutYouValues>({
    hometown_district: user?.hometown_district ?? null,
    college: user?.college ?? null,
    years_in_us: user?.years_in_us ?? null,
    languages: user?.languages ?? [],
  });

  // Photo state
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);

  // Prevents setState after unmount in async handlers (handleSave, photo flows).
  // Without this, RNTL cleanup on CI can race with the finally blocks below and
  // stall React 19's act scope — see apps/mobile/CLAUDE.md rule #7.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const originalZip = user?.zip_code || '';
  const displayPhotoUrl = localPhotoUri || user?.profile_photo || null;
  const hasPhoto = !!displayPhotoUrl;

  const handleZipChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, APP_CONFIG.zipCodeLength);
    setZipCode(cleaned);
    setMetroName(null);
    setResolvedMetroId(null);

    if (cleaned.length === APP_CONFIG.zipCodeLength) {
      const metro = await fetchMetroByZip(cleaned);
      if (metro) {
        setMetroName(`${metro.name}, ${metro.state}`);
        setResolvedMetroId(metro.id);
      } else {
        setMetroName(null);
        setResolvedMetroId(null);
        setErrors((prev) => ({
          ...prev,
          zipCode: 'No metro area found for this ZIP code',
        }));
      }
    }
  };

  const requestPermission = async (type: 'camera' | 'library'): Promise<boolean> => {
    const result = type === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!result.granted) {
      const permissionName = type === 'camera' ? 'Camera' : 'Photo Library';
      Alert.alert(
        `${permissionName} Access Required`,
        `Nepally needs ${permissionName.toLowerCase()} access to set your profile photo. Please enable it in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  };

  const processAndUploadImage = async (uri: string) => {
    if (!user) return;

    setPhotoUploading(true);
    setPhotoStatus(null);

    try {
      // Resize to 500x500 JPEG 80%
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Read file as ArrayBuffer using new expo-file-system File API
      const file = new File(manipulated.uri);
      const arrayBuffer = await file.arrayBuffer();

      // Upload to Supabase Storage
      const { url, error: uploadError } = await uploadProfilePhoto(supabase, user.id, arrayBuffer);
      if (uploadError) throw uploadError;

      // Update user profile with new photo URL
      const { error: profileError } = await updateUserProfile(supabase, user.id, {
        profile_photo: url,
      });
      if (profileError) throw profileError;

      setLocalPhotoUri(url!);
      await refreshUser();
      if (mountedRef.current) {
        setPhotoStatus({ type: 'success', message: 'Photo updated' });
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        setPhotoStatus({ type: 'error', message: getErrorMessage(error, 'Failed to upload photo') });
      }
    } finally {
      if (mountedRef.current) {
        setPhotoUploading(false);
      }
    }
  };

  const handleTakePhoto = async () => {
    const granted = await requestPermission('camera');
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      await processAndUploadImage(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    const granted = await requestPermission('library');
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      await processAndUploadImage(result.assets[0].uri);
    }
  };

  const handleRemovePhoto = async () => {
    if (!user) return;

    setPhotoUploading(true);
    setPhotoStatus(null);

    try {
      const { error: removeError } = await removeProfilePhoto(supabase, user.id);
      if (removeError) throw removeError;

      setLocalPhotoUri(null);
      await refreshUser();
      if (mountedRef.current) {
        setPhotoStatus({ type: 'success', message: 'Photo removed' });
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        setPhotoStatus({ type: 'error', message: getErrorMessage(error, 'Failed to remove photo') });
      }
    } finally {
      if (mountedRef.current) {
        setPhotoUploading(false);
      }
    }
  };

  const handlePhotoPress = () => {
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handleChooseFromLibrary },
    ];

    if (hasPhoto) {
      options.push({ text: 'Remove Photo', onPress: handleRemovePhoto, style: 'destructive' });
    }

    options.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert('Profile Photo', undefined, options);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (fullName.trim().length < 2) {
      newErrors.fullName = 'Name must be at least 2 characters';
    }

    if (bio.length > BIO_MAX_LENGTH) {
      newErrors.bio = `Bio must be at most ${BIO_MAX_LENGTH} characters`;
    }

    if (zipCode && zipCode.length !== APP_CONFIG.zipCodeLength) {
      newErrors.zipCode = `ZIP code must be ${APP_CONFIG.zipCodeLength} digits`;
    }

    if (zipCode !== originalZip && zipCode.length === APP_CONFIG.zipCodeLength && !resolvedMetroId) {
      newErrors.zipCode = 'No metro area found for this ZIP code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);

    try {
      const parsedBio = bioSchema.safeParse(bio);
      if (!parsedBio.success) {
        setErrors((prev) => ({
          ...prev,
          bio: parsedBio.error.issues[0]?.message || 'Invalid bio',
        }));
        setSaving(false);
        return;
      }

      const profileResult = await updateUserProfile(supabase, user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        bio: parsedBio.data,
        hometown_district: aboutYou.hometown_district,
        college: aboutYou.college,
        years_in_us: aboutYou.years_in_us,
        languages: aboutYou.languages,
      });

      if (profileResult.error) {
        throw profileResult.error;
      }

      if (zipCode !== originalZip && resolvedMetroId) {
        const locationSuccess = await updateLocation(user.id, zipCode, resolvedMetroId);
        if (!locationSuccess) {
          Alert.alert('Warning', 'Profile updated but location change failed. Please try again.');
        } else {
          const metro = await fetchMetroByZip(zipCode);
          if (metro) {
            await saveMetroArea(metro);
          }
        }
      }

      await refreshUser();
      if (mountedRef.current) {
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        Alert.alert('Error', getErrorMessage(error, 'Failed to update profile'));
      }
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={handlePhotoPress} disabled={photoUploading} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
              <Avatar
                name={user?.full_name || '?'}
                photoUrl={displayPhotoUrl}
                trustLevel={user?.trust_level}
                size="xlarge"
              />
              {photoUploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color={colors.white} />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePhotoPress} disabled={photoUploading}>
            <Text style={styles.photoLink}>
              {hasPhoto ? 'Change Photo' : 'Add Photo'}
            </Text>
          </TouchableOpacity>
          {photoStatus && (
            <Text style={[
              styles.photoStatusText,
              photoStatus.type === 'success' ? styles.photoStatusSuccess : styles.photoStatusError,
            ]}>
              {photoStatus.message}
            </Text>
          )}
        </View>

        {/* Full Name */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, errors.fullName && styles.inputError]}
            placeholder="Your full name"
            placeholderTextColor={colors.text.disabled}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
          />
          {errors.fullName && (
            <Text style={styles.errorText}>{errors.fullName}</Text>
          )}
        </View>

        {/* Bio */}
        <View style={styles.fieldContainer}>
          <View style={styles.bioLabelRow}>
            <Text style={styles.label}>Bio</Text>
            <Text
              style={[
                styles.bioCounter,
                bio.length > BIO_MAX_LENGTH && styles.bioCounterOver,
              ]}
            >
              {bio.length}/{BIO_MAX_LENGTH}
            </Text>
          </View>
          <TextInput
            style={[styles.bioInput, errors.bio && styles.inputError]}
            placeholder="A short line about you — what you're up to, how others can help."
            placeholderTextColor={colors.text.disabled}
            value={bio}
            onChangeText={setBio}
            multiline
            textAlignVertical="top"
            maxLength={BIO_MAX_LENGTH + 50}
          />
          {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
        </View>

        {/* Phone Number */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor={colors.text.disabled}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />
        </View>

        {/* ZIP Code */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>ZIP Code</Text>
          <TextInput
            style={[styles.input, errors.zipCode && styles.inputError]}
            placeholder="5-digit ZIP code"
            placeholderTextColor={colors.text.disabled}
            value={zipCode}
            onChangeText={handleZipChange}
            keyboardType="number-pad"
            maxLength={APP_CONFIG.zipCodeLength}
          />
          {errors.zipCode && (
            <Text style={styles.errorText}>{errors.zipCode}</Text>
          )}
          {metroLoading && (
            <Text style={styles.helperText}>Looking up metro area...</Text>
          )}
          {metroName && (
            <Text style={styles.metroText}>{metroName}</Text>
          )}
        </View>

        {/* About You */}
        <AboutYouSection values={aboutYou} onChange={setAboutYou} disabled={saving} />

        {/* Save Button */}
        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    padding: spacing.l,
    gap: spacing.m,
  },
  photoSection: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  avatarWrapper: {
    position: 'relative',
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoLink: {
    ...typography.body,
    color: colors.primary.main,
    fontWeight: '600',
  },
  photoStatusText: {
    ...typography.caption,
  },
  photoStatusSuccess: {
    color: colors.success,
  },
  photoStatusError: {
    color: colors.error,
  },
  fieldContainer: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    ...typography.body,
    color: colors.text.primary,
  },
  bioLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  bioCounter: {
    ...typography.caption,
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  bioCounterOver: {
    color: colors.error,
    fontWeight: '600',
  },
  bioInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    ...typography.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  helperText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  metroText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: spacing.s,
  },
});
