import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test-utils';
import { DateTimeField, type DateTimeFieldProps } from './DateTimeField';

function renderField(props: Partial<DateTimeFieldProps> = {}) {
  const onChange = vi.fn();
  render(
    <DateTimeField
      label="Start Date & Time *"
      value=""
      onChange={onChange}
      dateId="event-start-date"
      timeId="event-start-time"
      dateLabel="Start date"
      timeLabel="Start time"
      {...props}
    />
  );
  return { onChange };
}

describe('DateTimeField', () => {
  it('names the pair as a group', () => {
    renderField();

    expect(screen.getByRole('group', { name: 'Start Date & Time *' })).toBeDefined();
  });

  it('gives each input the id its caller asked for', () => {
    renderField();

    expect(screen.getByLabelText('Start date').id).toBe('event-start-date');
    expect(screen.getByLabelText('Start time').id).toBe('event-start-time');
  });

  it('splits an existing value across the two inputs', () => {
    renderField({ value: '2026-10-04T18:30' });

    expect((screen.getByLabelText('Start date') as HTMLInputElement).value).toBe('2026-10-04');
    expect((screen.getByLabelText('Start time') as HTMLInputElement).value).toBe('18:30');
  });

  it('starts a new value at midnight when only the date is set', () => {
    const { onChange } = renderField();

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-04' } });

    expect(onChange).toHaveBeenCalledWith('2026-10-04T00:00');
  });

  it('keeps the time already chosen when the date changes', () => {
    const { onChange } = renderField({ value: '2026-10-04T18:30' });

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-10-05' } });

    expect(onChange).toHaveBeenCalledWith('2026-10-05T18:30');
  });

  it('combines a time with the date already chosen', () => {
    const { onChange } = renderField({ value: '2026-10-04T00:00' });

    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:15' } });

    expect(onChange).toHaveBeenCalledWith('2026-10-04T09:15');
  });

  it('ignores a time until a date has been chosen', () => {
    const { onChange } = renderField({ value: '' });

    fireEvent.change(screen.getByLabelText('Start time'), { target: { value: '09:15' } });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears the whole value when the date is cleared', () => {
    const { onChange } = renderField({ value: '2026-10-04T18:30' });

    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('passes the earliest selectable date to the date input', () => {
    renderField({ minDate: '2026-09-20' });

    expect(screen.getByLabelText('Start date').getAttribute('min')).toBe('2026-09-20');
  });

  it('shows one error for the pair, linked to the group', () => {
    renderField({ error: 'Start date is required' });

    const group = screen.getByRole('group', { name: 'Start Date & Time *' });
    expect(group.getAttribute('aria-describedby')).toBe(screen.getByText('Start date is required').id);
  });
});
