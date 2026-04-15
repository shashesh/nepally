import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { spacing } from '../../styles/spacing';
import { warmBorder, warmRadius, warmShadow, warmSurface } from '../../styles/warmTokens';

interface ListingGridCardSkeletonProps {
  /** Grid cell width — skeleton matches the real card width */
  width: number;
}

export function ListingGridCardSkeleton({ width }: ListingGridCardSkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  const imageHeight = Math.round(width * 1.25); // 4:5 aspect

  return (
    <View
      style={[styles.card, { width }]}
      accessibilityLabel="Loading listing"
    >
      <Animated.View style={[styles.image, { height: imageHeight, opacity }]} />
      <View style={styles.body}>
        <Animated.View style={[styles.linePrice, { opacity }]} />
        <Animated.View style={[styles.lineTitle, { opacity }]} />
        <Animated.View style={[styles.lineTitleShort, { opacity }]} />
        <Animated.View style={[styles.lineMeta, { opacity }]} />
      </View>
    </View>
  );
}

const SHIMMER_BG = '#EDE6DC';

const styles = StyleSheet.create({
  card: {
    backgroundColor: warmSurface.card,
    borderRadius: warmRadius.card,
    borderWidth: 1,
    borderColor: warmBorder.hairline,
    overflow: 'hidden',
    ...warmShadow,
  },
  image: {
    width: '100%',
    backgroundColor: SHIMMER_BG,
  },
  body: {
    padding: spacing.xs,
    gap: 6,
  },
  linePrice: {
    height: 16,
    width: '40%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
  },
  lineTitle: {
    height: 12,
    width: '90%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
  },
  lineTitleShort: {
    height: 12,
    width: '60%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
  },
  lineMeta: {
    height: 10,
    width: '50%',
    backgroundColor: SHIMMER_BG,
    borderRadius: 4,
    marginTop: 4,
  },
});
