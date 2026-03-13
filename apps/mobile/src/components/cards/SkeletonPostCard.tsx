import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';

export const SkeletonPostCard: React.FC = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Author row */}
      <View style={styles.authorRow}>
        <View style={styles.avatar} />
        <View style={styles.authorLines}>
          <View style={styles.nameLine} />
          <View style={styles.timestampLine} />
        </View>
      </View>

      {/* Title lines */}
      <View style={styles.titleLine1} />
      <View style={styles.titleLine2} />

      {/* Image placeholder */}
      <View style={styles.imagePlaceholder} />

      {/* Action bar stubs */}
      <View style={styles.actionBar}>
        <View style={styles.actionStub} />
        <View style={styles.actionStub} />
        <View style={styles.actionStub} />
      </View>
    </Animated.View>
  );
};

const BLOCK = colors.border;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    paddingTop: spacing.s,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.s,
    marginBottom: 12,
    gap: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BLOCK,
  },
  authorLines: {
    flex: 1,
    gap: 6,
  },
  nameLine: {
    height: 12,
    width: 120,
    borderRadius: 6,
    backgroundColor: BLOCK,
  },
  timestampLine: {
    height: 10,
    width: 60,
    borderRadius: 5,
    backgroundColor: BLOCK,
  },
  titleLine1: {
    height: 14,
    marginHorizontal: spacing.s,
    borderRadius: 7,
    backgroundColor: BLOCK,
    marginBottom: 6,
  },
  titleLine2: {
    height: 14,
    marginHorizontal: spacing.s,
    width: '60%',
    borderRadius: 7,
    backgroundColor: BLOCK,
    marginBottom: spacing.xs,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: BLOCK,
    marginBottom: spacing.xs,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    paddingBottom: spacing.s,
    gap: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionStub: {
    height: 20,
    width: 48,
    borderRadius: 10,
    backgroundColor: BLOCK,
  },
});
