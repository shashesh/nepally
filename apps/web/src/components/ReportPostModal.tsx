import React, { useState } from 'react';
import { Button, Group, Modal, Radio, Stack, Text, Textarea } from '@mantine/core';
import styles from './ReportPostModal.module.css';

export type ReportSubmissionInput = {
  reason: string;
  description?: string;
};

type ReportSubmitResult = {
  error?: string;
};

type ReportPostModalProps = {
  opened: boolean;
  onClose: () => void;
  onSubmit: (input: ReportSubmissionInput) => Promise<ReportSubmitResult>;
  submitting?: boolean;
};

const REPORT_REASONS = [
  { label: 'Spam', value: 'Spam' },
  { label: 'Scam or fraud', value: 'Scam' },
  { label: 'Harassment or hate', value: 'Harassment' },
  { label: 'Inappropriate content', value: 'Inappropriate Content' },
  { label: 'Something else', value: 'Other' },
] as const;

export default function ReportPostModal({ opened, onClose, onSubmit, submitting = false }: ReportPostModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prevOpened, setPrevOpened] = useState(opened);

  // Start from a blank form each time the modal opens.
  if (opened !== prevOpened) {
    setPrevOpened(opened);
    if (opened) {
      setReason('');
      setDescription('');
      setErrorMessage(null);
    }
  }

  async function handleSubmit() {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('Please select a reason before submitting.');
      return;
    }

    setErrorMessage(null);
    const result = await onSubmit({
      reason: trimmedReason,
      description: description.trim() || undefined,
    });

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    onClose();
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Report post"
      centered
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Your report is private. Our moderation team will review it.
        </Text>

        <Radio.Group
          label="Why are you reporting this post?"
          value={reason}
          onChange={setReason}
          required
        >
          <Stack mt="xs" gap="xs">
            {REPORT_REASONS.map((option) => (
              <Radio
                key={option.value}
                value={option.value}
                label={option.label}
              />
            ))}
          </Stack>
        </Radio.Group>

        <Textarea
          label="Additional details (optional)"
          placeholder="Add any details that will help our moderators review faster."
          minRows={3}
          maxRows={6}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />

        {errorMessage && (
          <Text size="sm" className={styles.errorMessage} role="alert">
            {errorMessage}
          </Text>
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!reason.trim()}>
            Submit report
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}