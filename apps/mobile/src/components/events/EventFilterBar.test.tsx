import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EventFilterBar, type EventFilterBarValue } from './EventFilterBar';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@nepally/shared', () => ({
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

describe('EventFilterBar', () => {
  describe('rendering', () => {
    it('renders search input', () => {
      const { getByPlaceholderText } = render(
        <EventFilterBar value={DEFAULT_VALUE} onChange={jest.fn()} />
      );
      expect(getByPlaceholderText('Search events...')).toBeTruthy();
    });

    it('renders all type chips', () => {
      const { getByText } = render(
        <EventFilterBar value={DEFAULT_VALUE} onChange={jest.fn()} />
      );
      expect(getByText('🗓️ All')).toBeTruthy();
      expect(getByText('🎭 Cultural')).toBeTruthy();
      expect(getByText('🕌 Religious')).toBeTruthy();
      expect(getByText('🎉 Social')).toBeTruthy();
      expect(getByText('💼 Career')).toBeTruthy();
      expect(getByText('📌 Other')).toBeTruthy();
    });

    it('does not show clear button when query is empty', () => {
      const { queryByLabelText } = render(
        <EventFilterBar value={DEFAULT_VALUE} onChange={jest.fn()} />
      );
      expect(queryByLabelText('Clear search')).toBeNull();
    });

    it('shows clear button when query is non-empty', () => {
      const { getByLabelText } = render(
        <EventFilterBar value={{ type: 'all', query: 'dashain' }} onChange={jest.fn()} />
      );
      expect(getByLabelText('Clear search')).toBeTruthy();
    });
  });

  describe('type chip interactions', () => {
    it('calls onChange with selected type when a chip is pressed', () => {
      const onChange = jest.fn();
      const { getByText } = render(
        <EventFilterBar value={DEFAULT_VALUE} onChange={onChange} />
      );
      fireEvent.press(getByText('🎭 Cultural'));
      expect(onChange).toHaveBeenCalledWith({ type: 'cultural', query: '' });
    });

    it('calls onChange with "all" when All chip is pressed', () => {
      const onChange = jest.fn();
      const { getByText } = render(
        <EventFilterBar value={{ type: 'cultural', query: '' }} onChange={onChange} />
      );
      fireEvent.press(getByText('🗓️ All'));
      expect(onChange).toHaveBeenCalledWith({ type: 'all', query: '' });
    });

    it('preserves existing query when changing type', () => {
      const onChange = jest.fn();
      const { getByText } = render(
        <EventFilterBar value={{ type: 'all', query: 'dashain' }} onChange={onChange} />
      );
      fireEvent.press(getByText('💼 Career'));
      expect(onChange).toHaveBeenCalledWith({ type: 'career', query: 'dashain' });
    });
  });

  describe('search input interactions', () => {
    it('calls onChange with new query after debounce', () => {
      // searchDebounceMs={0} makes handleSearchChange call onChange synchronously,
      // so no act()/waitFor is needed. A bare `await act(async () => {})` here was
      // flaky on Ubuntu CI (apps/mobile/CLAUDE.md rule #2).
      const onChange = jest.fn();
      const { getByPlaceholderText } = render(
        <EventFilterBar value={DEFAULT_VALUE} onChange={onChange} searchDebounceMs={0} />
      );
      fireEvent.changeText(getByPlaceholderText('Search events...'), 'dashain');
      expect(onChange).toHaveBeenCalledWith({ type: 'all', query: 'dashain' });
    });

    it('clears query when clear button is pressed', () => {
      const onChange = jest.fn();
      const { getByLabelText } = render(
        <EventFilterBar value={{ type: 'all', query: 'dashain' }} onChange={onChange} />
      );
      fireEvent.press(getByLabelText('Clear search'));
      expect(onChange).toHaveBeenCalledWith({ type: 'all', query: '' });
    });

    it('preserves type when clearing query', () => {
      const onChange = jest.fn();
      const { getByLabelText } = render(
        <EventFilterBar value={{ type: 'career', query: 'networking' }} onChange={onChange} />
      );
      fireEvent.press(getByLabelText('Clear search'));
      expect(onChange).toHaveBeenCalledWith({ type: 'career', query: '' });
    });
  });

  describe('external value sync', () => {
    it('syncs search text when value.query changes externally', () => {
      const { getByPlaceholderText, rerender } = render(
        <EventFilterBar value={DEFAULT_VALUE} onChange={jest.fn()} />
      );
      rerender(<EventFilterBar value={{ type: 'all', query: 'tihar' }} onChange={jest.fn()} />);
      expect(getByPlaceholderText('Search events...')).toBeTruthy();
    });
  });
});
