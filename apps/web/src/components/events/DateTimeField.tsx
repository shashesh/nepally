import React, { useId } from 'react';
import { Text, TextInput } from '@mantine/core';
import styles from './DateTimeField.module.css';

export interface DateTimeFieldProps {
  /** Group label, e.g. "Start Date & Time *". */
  label: string;
  /** Local `YYYY-MM-DDTHH:mm`, or '' when unset. */
  value: string;
  onChange: (value: string) => void;
  /** Ids for the two inputs; the e2e suite drives them directly. */
  dateId: string;
  timeId: string;
  /** Accessible names, e.g. "Start date" / "Start time". */
  dateLabel: string;
  timeLabel: string;
  /** Earliest selectable date, `YYYY-MM-DD`. */
  minDate?: string;
  error?: string;
}

/** The date half of a local `YYYY-MM-DDTHH:mm` string. */
export function getDatePart(value: string): string {
  return value && value.length >= 10 ? value.slice(0, 10) : '';
}

/** The time half of a local `YYYY-MM-DDTHH:mm` string. */
export function getTimePart(value: string): string {
  return value && value.length >= 16 ? value.slice(11, 16) : '';
}

/** Join a date and time back into `YYYY-MM-DDTHH:mm`; no date means no value. */
export function combineDateAndTime(date: string, time: string): string {
  if (!date) return '';
  return `${date}T${time || '00:00'}`;
}

/**
 * A date and a time, side by side, behaving as one value.
 *
 * Native `datetime-local` would be one input, but its rendering and keyboard
 * behaviour vary enough between browsers that create event has always split
 * the two. This keeps that split and the rule that came with it: the time is
 * meaningless until a date is set, so it does nothing until then.
 */
export function DateTimeField({
  label,
  value,
  onChange,
  dateId,
  timeId,
  dateLabel,
  timeLabel,
  minDate,
  error,
}: DateTimeFieldProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const errorId = `${baseId}-error`;

  const date = getDatePart(value);
  const time = getTimePart(value);

  return (
    <div
      className={styles.root}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
    >
      <Text id={labelId} component="span" className={styles.label}>
        {label}
      </Text>

      <div className={styles.row}>
        <TextInput
          id={dateId}
          type="date"
          aria-label={dateLabel}
          className={styles.field}
          value={date}
          min={minDate}
          error={Boolean(error)}
          onChange={(event) => onChange(combineDateAndTime(event.currentTarget.value, time))}
        />
        <TextInput
          id={timeId}
          type="time"
          aria-label={timeLabel}
          className={styles.field}
          value={time}
          error={Boolean(error)}
          onChange={(event) => {
            // Without a date there is nothing to attach the time to.
            if (!date) return;
            onChange(combineDateAndTime(date, event.currentTarget.value));
          }}
        />
      </div>

      {error && (
        <Text id={errorId} size="xs" className={styles.error}>
          {error}
        </Text>
      )}
    </div>
  );
}
