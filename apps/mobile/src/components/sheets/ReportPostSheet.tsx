import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../styles/colors';
import { spacing } from '../../styles/spacing';
import { typography } from '../../styles/typography';

type ReportReason = 'Spam' | 'Scam' | 'Inappropriate Content' | 'Harassment' | 'Other';

const REPORT_REASONS: ReportReason[] = [
  'Spam',
  'Scam',
  'Inappropriate Content',
  'Harassment',
  'Other',
];

interface ReportPostSheetProps {
  visible: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, description?: string) => Promise<void>;
}

export function ReportPostSheet({
  visible,
  submitting = false,
  onClose,
  onSubmit,
}: ReportPostSheetProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSelectedReason(null);
    setDetails('');
  }, [visible]);

  const isSubmitDisabled = useMemo(() => !selectedReason || submitting, [selectedReason, submitting]);

  async function handleSubmit() {
    if (!selectedReason || submitting) return;
    await onSubmit(selectedReason, details.trim() || undefined);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          testID="report-sheet-backdrop"
          style={styles.backdrop}
          onPress={onClose}
          disabled={submitting}
        />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.handle} />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Close report sheet"
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Report Post</Text>
          <Text style={styles.subtitle}>Choose a reason so moderators can review this quickly.</Text>

          <View style={styles.reasonList}>
            {REPORT_REASONS.map((reason) => {
              const selected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonItem, selected && styles.reasonItemSelected]}
                  onPress={() => setSelectedReason(reason)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Reason ${reason}`}
                >
                  <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>{reason}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={18} color={colors.primary.main} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.detailsLabel}>Additional details (optional)</Text>
          <TextInput
            style={styles.detailsInput}
            value={details}
            onChangeText={setDetails}
            editable={!submitting}
            multiline
            numberOfLines={3}
            maxLength={300}
            placeholder="Add anything helpful for review"
            placeholderTextColor={colors.text.secondary}
            textAlignVertical="top"
          />

          <View style={styles.footerRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isSubmitDisabled}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: spacing.m,
    paddingTop: spacing.s,
    paddingBottom: spacing.l,
    gap: spacing.s,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 26,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: -4,
  },
  reasonList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  reasonItem: {
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  reasonItemSelected: {
    backgroundColor: colors.primary.light,
  },
  reasonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: colors.primary.main,
    fontWeight: '700',
  },
  detailsLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailsInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    ...typography.body,
    color: colors.text.primary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.xs,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
