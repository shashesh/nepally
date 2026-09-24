import React, { useRef, useState, type FormEvent } from 'react';
import { ActionIcon, Loader, TextInput } from '@mantine/core';
import { IconSend } from '@tabler/icons-react';
import { notify } from '../ui/notify';
import styles from './thread.module.css';

export interface MessageComposerProps {
  /** Public name, for the field's label. */
  partnerName: string;
  /** Resolves false when the message was not sent. */
  onSend: (text: string) => Promise<boolean>;
}

/**
 * Sticky at the foot of the thread. Send is natively disabled only while the
 * field is blank; while sending it is aria-disabled, so the member keeps
 * focus on it (web-ui-system.md, "Busy controls stay focusable"). A sent
 * message clears the field and puts focus back in it, so Send going blank-
 * disabled never strands focus.
 */
export function MessageComposer({ partnerName, onSend }: MessageComposerProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  // State lags a render, so a quick second Enter would still see `sending` false.
  const sendingRef = useRef(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const isBlank = draft.trim() === '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isBlank || sendingRef.current) return;

    const text = draft;
    sendingRef.current = true;
    setSending(true);
    let sent = false;
    try {
      sent = await onSend(text);
    } catch {
      sent = false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }

    if (sent) {
      // The field stays editable while sending: keep anything typed since.
      setDraft((current) => (current === text ? '' : current));
      fieldRef.current?.focus();
    } else {
      notify.error("Couldn't send your message. Please try again.");
    }
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <TextInput
        ref={fieldRef}
        className={styles.field}
        aria-label={`Message ${partnerName}`}
        placeholder="Write a message…"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
        autoComplete="off"
        radius="xl"
      />
      <ActionIcon
        type="submit"
        size="input-sm"
        radius="xl"
        aria-label="Send message"
        disabled={isBlank}
        aria-disabled={sending || undefined}
        data-disabled={sending || undefined}
      >
        {sending ? <Loader size={16} color="currentColor" /> : <IconSend size={18} aria-hidden="true" />}
      </ActionIcon>
    </form>
  );
}
