import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  useAnimatedValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { typography } from '../../styles/typography';
import { spacing } from '../../styles/spacing';

interface PostMoreSheetProps {
  visible: boolean;
  isOwnPost: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onShare?: () => void;
  isSaved?: boolean;
  onSave?: () => void;
}

interface ActionItem {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function PostMoreSheet({
  visible,
  isOwnPost,
  onClose,
  onEdit,
  onDelete,
  onReport,
  onShare,
  isSaved,
  onSave,
}: PostMoreSheetProps) {
  const translateY = useAnimatedValue(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5 && gs.dy > Math.abs(gs.dx),
        onPanResponderMove: (_, gs) => {
          if (gs.dy > 0) translateY.setValue(gs.dy);
        },
        onPanResponderRelease: (_, gs) => {
          if (gs.dy > 80 || gs.vy > 0.4) {
            onClose();
            translateY.setValue(0);
          } else {
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 100, friction: 10 }).start();
          }
        },
      }),
    [onClose, translateY]
  );

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const saveAction: ActionItem | null = onSave
    ? {
        icon: isSaved ? 'bookmark' : 'bookmark-outline',
        label: isSaved ? 'Unsave Post' : 'Save Post',
        onPress: onSave,
      }
    : null;

  const actions: ActionItem[] = isOwnPost
    ? [
        ...(onEdit ? [{ icon: 'create-outline' as const, label: 'Edit Post', onPress: onEdit }] : []),
        ...(onShare ? [{ icon: 'share-outline' as const, label: 'Share Post', onPress: onShare }] : []),
        ...(onDelete
          ? [{ icon: 'trash-outline' as const, label: 'Delete Post', onPress: onDelete, destructive: true }]
          : []),
      ]
    : [
        ...(saveAction ? [saveAction] : []),
        ...(onShare ? [{ icon: 'share-outline' as const, label: 'Share Post', onPress: onShare }] : []),
        ...(onReport
          ? [{ icon: 'flag-outline' as const, label: 'Report Post', onPress: onReport, destructive: true }]
          : []),
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
          testID="post-more-sheet"
          {...panResponder.panHandlers}
        >
          {/* Drag Handle */}
          <View style={styles.handle} />

          {/* Action List */}
          {actions.map((action, index) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.actionRow, index < actions.length - 1 && styles.actionRowBorder]}
              onPress={() => {
                onClose();
                action.onPress();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={action.icon}
                size={22}
                color={action.destructive ? colors.accent.red : colors.text.primary}
              />
              <Text
                style={[
                  styles.actionLabel,
                  action.destructive && styles.actionLabelDestructive,
                ]}
              >
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelRow} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.s,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.m,
    gap: spacing.s,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  actionLabelDestructive: {
    color: colors.accent.red,
  },
  cancelRow: {
    marginHorizontal: spacing.m,
    marginTop: spacing.s,
    paddingVertical: spacing.m,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
