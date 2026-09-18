import React from 'react';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';
import { EventFilterBar, type EventFilterBarValue } from './EventFilterBar';

vi.mock('@nepally/shared', () => ({
  EVENT_TYPES: ['cultural', 'religious', 'social', 'career', 'other'],
  EVENT_TYPE_LABELS: {
    cultural: 'Cultural',
    religious: 'Religious',
    social: 'Social',
    career: 'Career',
    other: 'Other',
  },
  EVENT_TYPE_ICONS: {
    cultural: '🎭',
    religious: '🕌',
    social: '🎉',
    career: '💼',
    other: '📌',
  },
}));

const DEFAULT_VALUE: EventFilterBarValue = { type: 'all', query: '' };

describe('EventFilterBar (web)', () => {
  describe('rendering', () => {
    it('renders search input', () => {
      render(<EventFilterBar value={DEFAULT_VALUE} onChange={vi.fn()} />);
      expect(screen.getByRole('searchbox', { name: 'Search events' })).toBeDefined();
    });

    it('renders all type chips', () => {
      render(<EventFilterBar value={DEFAULT_VALUE} onChange={vi.fn()} />);
      expect(screen.getByText('🗓️ All')).toBeDefined();
      expect(screen.getByText('🎭 Cultural')).toBeDefined();
      expect(screen.getByText('🕌 Religious')).toBeDefined();
      expect(screen.getByText('🎉 Social')).toBeDefined();
      expect(screen.getByText('💼 Career')).toBeDefined();
      expect(screen.getByText('📌 Other')).toBeDefined();
    });

    it('does not show clear button when query is empty', () => {
      render(<EventFilterBar value={DEFAULT_VALUE} onChange={vi.fn()} />);
      expect(screen.queryByLabelText('Clear search')).toBeNull();
    });

    it('shows clear button when query is non-empty', () => {
      render(<EventFilterBar value={{ type: 'all', query: 'dashain' }} onChange={vi.fn()} />);
      expect(screen.getByLabelText('Clear search')).toBeDefined();
    });
  });

  describe('type chip interactions', () => {
    it('calls onChange with selected type when a chip is clicked', () => {
      const onChange = vi.fn();
      render(<EventFilterBar value={DEFAULT_VALUE} onChange={onChange} />);
      fireEvent.click(screen.getByText('🎭 Cultural'));
      expect(onChange).toHaveBeenCalledWith({ type: 'cultural', query: '' });
    });

    it('calls onChange with "all" when All chip is clicked', () => {
      const onChange = vi.fn();
      render(<EventFilterBar value={{ type: 'cultural', query: '' }} onChange={onChange} />);
      fireEvent.click(screen.getByText('🗓️ All'));
      expect(onChange).toHaveBeenCalledWith({ type: 'all', query: '' });
    });

    it('preserves existing query when changing type', () => {
      const onChange = vi.fn();
      render(<EventFilterBar value={{ type: 'all', query: 'dashain' }} onChange={onChange} />);
      fireEvent.click(screen.getByText('💼 Career'));
      expect(onChange).toHaveBeenCalledWith({ type: 'career', query: 'dashain' });
    });
  });

  describe('search input interactions', () => {
    it('calls onChange with new query after debounce', async () => {
      const onChange = vi.fn();
      render(<EventFilterBar value={DEFAULT_VALUE} onChange={onChange} searchDebounceMs={0} />);
      const input = screen.getByRole('searchbox', { name: 'Search events' });
      fireEvent.change(input, { target: { value: 'dashain' } });
      await waitFor(() => expect(onChange).toHaveBeenCalledWith({ type: 'all', query: 'dashain' }));
    });

    it('fires onChange immediately on Enter key', () => {
      const onChange = vi.fn();
      render(<EventFilterBar value={DEFAULT_VALUE} onChange={onChange} />);
      const input = screen.getByRole('searchbox', { name: 'Search events' });
      fireEvent.change(input, { target: { value: 'tihar' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith({ type: 'all', query: 'tihar' });
    });

    it('clears query when clear button is clicked', () => {
      const onChange = vi.fn();
      render(<EventFilterBar value={{ type: 'all', query: 'dashain' }} onChange={onChange} />);
      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(onChange).toHaveBeenCalledWith({ type: 'all', query: '' });
    });

    it('preserves type when clearing query', () => {
      const onChange = vi.fn();
      render(
        <EventFilterBar value={{ type: 'career', query: 'networking' }} onChange={onChange} />
      );
      fireEvent.click(screen.getByLabelText('Clear search'));
      expect(onChange).toHaveBeenCalledWith({ type: 'career', query: '' });
    });
  });

  describe('external value sync', () => {
    it('syncs search text when value.query changes externally', () => {
      const { rerender } = render(<EventFilterBar value={DEFAULT_VALUE} onChange={vi.fn()} />);
      rerender(<EventFilterBar value={{ type: 'all', query: 'tihar' }} onChange={vi.fn()} />);
      const input = screen.getByRole('searchbox', { name: 'Search events' }) as HTMLInputElement;
      expect(input.value).toBe('tihar');
    });

    it('keeps typed text when the parent re-renders with the same query', () => {
      const { rerender } = render(<EventFilterBar value={DEFAULT_VALUE} onChange={vi.fn()} />);
      const input = screen.getByRole('searchbox', { name: 'Search events' }) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'teej' } });
      rerender(<EventFilterBar value={{ type: 'cultural', query: '' }} onChange={vi.fn()} />);
      expect(input.value).toBe('teej');
    });
  });
});
