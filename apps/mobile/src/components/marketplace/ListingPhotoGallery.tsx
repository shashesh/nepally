import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Galeria as GaleriaComponent, GaleriaViewProps } from '@nandorojo/galeria';
import { isExpoGo } from '../../utils/isExpoGo';
import { spacing, borderRadius } from '../../styles/spacing';
import { typography } from '../../styles/typography';
import { colors } from '../../styles/colors';

export interface ListingPhotoGalleryProps {
  photos: string[];
  width: number;
  height: number;
}

/**
 * Galeria, the full-screen viewer, is native, and Expo Go doesn't have it, so
 * it's loaded only outside Expo Go, the way expo-notifications is. In Expo Go
 * the photos show without the viewer.
 */
function loadGaleria(): typeof GaleriaComponent | null {
  if (isExpoGo) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@nandorojo/galeria') as typeof import('@nandorojo/galeria')).Galeria;
}

// Picked once, when the module loads: a component chosen during render would
// remount its subtree on every render.
const Galeria = loadGaleria();

/**
 * A listing's photos as a swipeable carousel with a counter. A tap opens them
 * full screen, where they can be pinch-zoomed, swiped through and swiped away.
 */
export function ListingPhotoGallery({ photos, width, height }: ListingPhotoGalleryProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  // New photos (after an edit, say) start the carousel over, and its key
  // remounts it at the first photo, so the count never reads "3 / 1".
  const photoSet = photos.join(' ');
  const [shownPhotoSet, setShownPhotoSet] = useState(photoSet);
  if (photoSet !== shownPhotoSet) {
    setShownPhotoSet(photoSet);
    setPhotoIndex(0);
  }

  // Swiping in the viewer moves the carousel too, so closing the viewer lands
  // on the photo it last showed.
  const handleViewerIndexChange: GaleriaViewProps['onIndexChange'] = (event) => {
    const index = event.nativeEvent.currentIndex;
    setPhotoIndex(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: false });
  };

  const carousel = (
    <ScrollView
      key={photoSet}
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={(event) => {
        setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / width));
      }}
    >
      {photos.map((photo, index) => {
        const image = (
          <Image
            source={photo}
            style={[styles.photo, { width, height }]}
            contentFit="cover"
            accessible
            accessibilityRole={Galeria ? 'imagebutton' : 'image'}
            accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
          />
        );
        return Galeria ? (
          <Galeria.Image key={photo + index} index={index} onIndexChange={handleViewerIndexChange}>
            {image}
          </Galeria.Image>
        ) : (
          <React.Fragment key={photo + index}>{image}</React.Fragment>
        );
      })}
    </ScrollView>
  );

  return (
    <View>
      {Galeria ? (
        <Galeria urls={photos} theme="dark">
          {carousel}
        </Galeria>
      ) : (
        carousel
      )}
      {photos.length > 1 && (
        <View style={styles.counter} pointerEvents="none">
          <Text style={styles.counterText}>
            {photoIndex + 1} / {photos.length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: {
    backgroundColor: colors.background,
  },
  counter: {
    position: 'absolute',
    bottom: spacing.s,
    right: spacing.m,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.button,
  },
  counterText: {
    ...typography.caption,
    color: colors.white,
  },
});
