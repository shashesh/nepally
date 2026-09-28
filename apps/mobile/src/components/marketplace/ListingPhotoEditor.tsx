import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import type { ListingPhoto } from './listingPhotos';

const THUMB_SIZE = 96;
/** The smallest touch target the platform guidelines allow. */
const MIN_TARGET = 44;

interface ListingPhotoEditorProps {
  /** In display order; the first is the cover. */
  photos: readonly ListingPhoto[];
  max: number;
  /** Picked photos are still being processed; adding waits for them. */
  busy: boolean;
  onAddFromLibrary: () => void;
  onTakePhoto: () => void;
  onRemove: (key: string) => void;
  onMakeCover: (key: string) => void;
}

/** The create/edit listing form's photo strip: cover first, then add and camera tiles. */
export function ListingPhotoEditor({
  photos,
  max,
  busy,
  onAddFromLibrary,
  onTakePhoto,
  onRemove,
  onMakeCover,
}: ListingPhotoEditorProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Photos (up to {max})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.strip}>
        {photos.map((photo, index) => {
          const number = index + 1;
          return (
            <View key={photo.key} style={styles.thumb}>
              <Image
                source={photo.kind === 'stored' ? photo.url : photo.uri}
                style={styles.thumbImage}
                contentFit="cover"
                accessible
                accessibilityLabel={index === 0 ? `Photo ${number}, the cover` : `Photo ${number}`}
              />
              {index === 0 ? (
                <View style={styles.coverBadge}>
                  <Text style={styles.coverBadgeText}>Cover</Text>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.makeCover, pressed && styles.pressed]}
                  onPress={() => onMakeCover(photo.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Make photo ${number} the cover`}
                >
                  <Text style={styles.makeCoverText}>Make cover</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
                onPress={() => onRemove(photo.key)}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${number}`}
              >
                <View style={styles.removeIcon}>
                  <Ionicons name="close" size={14} color={colors.white} />
                </View>
              </Pressable>
            </View>
          );
        })}
        {photos.length < max ? (
          <>
            <AddTile
              icon="images-outline"
              label="Add photos"
              busy={busy}
              onPress={onAddFromLibrary}
            />
            <AddTile icon="camera-outline" label="Take photo" busy={busy} onPress={onTakePhoto} />
          </>
        ) : null}
      </ScrollView>
      <Text style={styles.hint}>
        {photos.length}/{max} photos added
      </Text>
    </View>
  );
}

interface AddTileProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  busy: boolean;
  onPress: () => void;
}

function AddTile({ icon, label, busy, onPress }: AddTileProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.addTile, pressed && styles.pressed]}
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
    >
      {busy ? (
        <ActivityIndicator color={colors.primary.main} />
      ) : (
        <>
          <Ionicons name={icon} size={24} color={colors.primary.main} />
          <Text style={styles.addTileText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.m,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  strip: {
    flexGrow: 0,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    marginRight: spacing.s,
    borderRadius: borderRadius.input,
    overflow: 'hidden',
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  coverBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.input,
    backgroundColor: colors.primary.main,
  },
  coverBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  makeCover: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: MIN_TARGET - spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  makeCoverText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  // A 44pt corner target around a small visible ✕.
  remove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: MIN_TARGET,
    height: MIN_TARGET,
    alignItems: 'flex-end',
    padding: 4,
  },
  removeIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
  },
  pressed: {
    opacity: 0.7,
  },
  addTile: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
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
  addTileText: {
    ...typography.caption,
    color: colors.primary.main,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
