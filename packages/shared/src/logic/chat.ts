/**
 * Chat thread layout — pure helpers shared by web and mobile.
 */
import type { ChatMessage } from '../types/chat';

export interface ThreadMessage {
  message: ChatMessage;
  isOwn: boolean;
  /** Last message of a run from one sender within the day; a received run shows its avatar here. */
  endsRun: boolean;
}

export interface ThreadDay {
  /** `toDateString()` of the day, stable as a React key. */
  key: string;
  /** Timestamp of the day's first message, for formatDayLabel. */
  timestamp: string;
  messages: ThreadMessage[];
}

/** Splits chronological messages into local calendar days and marks where each sender's run ends. */
export function buildThreadDays(messages: ChatMessage[], viewerId: string): ThreadDay[] {
  const days: ThreadDay[] = [];

  messages.forEach((message, index) => {
    const key = new Date(message.timestamp).toDateString();
    const next = messages[index + 1];
    const endsRun =
      !next || next.sender_id !== message.sender_id || new Date(next.timestamp).toDateString() !== key;
    const item: ThreadMessage = { message, isOwn: message.sender_id === viewerId, endsRun };

    const current = days[days.length - 1];
    if (current && current.key === key) {
      current.messages.push(item);
    } else {
      days.push({ key, timestamp: message.timestamp, messages: [item] });
    }
  });

  return days;
}
