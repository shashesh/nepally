import React from 'react';
import { render, screen, fireEvent, act } from '../../test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Nothing is mocked here: the selects are Mantine NativeSelect, so they are
// real <select> elements, and the search field is a real Mantine TextInput.
import { FilterBar, type FilterBarValue } from './FilterBar';

const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Food & Restaurants', slug: 'food-restaurants', emoji: '🍜', icon: null, color: '#FF6B35', sort_order: 1, description: null, created_at: '' },
  { id: 'cat-2', name: 'Professional Services', slug: 'professional-services', emoji: '💼', icon: null, color: '#2196F3', sort_order: 2, description: null, created_at: '' },
];

const DEFAULT_VALUE: FilterBarValue = { category: '', sort: 'newest', query: '' };

describe('FilterBar (web)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with default "All Categories" and "Sort: Newest"', () => {
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange: vi.fn(),
      })
    );
    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    expect(categorySelect.value).toBe('');
    const sortSelect = screen.getByLabelText('Sort') as HTMLSelectElement;
    expect(sortSelect.value).toBe('newest');
  });

  it('renders category options including "All Categories"', () => {
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange: vi.fn(),
      })
    );
    expect(screen.getByText('All Categories')).toBeDefined();
    expect(screen.getByText(/Food & Restaurants/)).toBeDefined();
    expect(screen.getByText(/Professional Services/)).toBeDefined();
  });

  it('disables category select when lockedCategory is set', () => {
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: { ...DEFAULT_VALUE, category: 'food-restaurants' },
        onChange: vi.fn(),
        lockedCategory: 'food-restaurants',
      })
    );
    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    expect(categorySelect.disabled).toBe(true);
  });

  it('calls onChange when category is changed', () => {
    const onChange = vi.fn();
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange,
      })
    );
    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: 'food-restaurants' } });
    expect(onChange).toHaveBeenCalledWith({ category: 'food-restaurants', sort: 'newest', query: '' });
  });

  it('calls onChange when sort is changed', () => {
    const onChange = vi.fn();
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange,
      })
    );
    const sortSelect = screen.getByLabelText('Sort') as HTMLSelectElement;
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'price_asc', query: '' });
  });

  it('debounces search input and fires onChange after 300ms', () => {
    const onChange = vi.fn();
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange,
      })
    );
    const input = screen.getByLabelText('Search listings') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'momo' } });

    // Not yet fired
    expect(onChange).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'newest', query: 'momo' });
  });

  it('fires onChange immediately on Enter without waiting for debounce', () => {
    const onChange = vi.fn();
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange,
      })
    );
    const input = screen.getByLabelText('Search listings') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'momo' } });

    // Debounce not yet fired
    expect(onChange).not.toHaveBeenCalled();

    // Enter fires immediately and clears the pending debounce
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'newest', query: 'momo' });

    // Advancing past debounce should NOT fire a second time
    act(() => { vi.advanceTimersByTime(300); });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('cancels pending debounce on subsequent input', () => {
    const onChange = vi.fn();
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange,
      })
    );
    const input = screen.getByLabelText('Search listings') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'm' } });
    act(() => { vi.advanceTimersByTime(150); });
    fireEvent.change(input, { target: { value: 'mo' } });
    act(() => { vi.advanceTimersByTime(300); });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'newest', query: 'mo' });
  });

  it('syncs the search input when value.query changes externally', () => {
    const { rerender } = render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange: vi.fn(),
      })
    );
    rerender(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: { ...DEFAULT_VALUE, query: 'dal bhat' },
        onChange: vi.fn(),
      })
    );
    const input = screen.getByLabelText('Search listings') as HTMLInputElement;
    expect(input.value).toBe('dal bhat');
  });

  it('debounced search uses the latest filter value and keeps the typed text', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange,
      })
    );
    const input = screen.getByLabelText('Search listings') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'momo' } });

    // Parent changes sort while the search debounce is still pending
    rerender(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: { ...DEFAULT_VALUE, sort: 'price_asc' },
        onChange,
      })
    );
    expect(input.value).toBe('momo');

    act(() => { vi.advanceTimersByTime(300); });
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'price_asc', query: 'momo' });
  });

  it('cancels a pending debounce when the field is cleared', () => {
    const onChange = vi.fn();
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange,
      })
    );

    // Type, leaving a debounce in flight, then clear before it fires.
    fireEvent.change(screen.getByLabelText('Search listings'), {
      target: { value: 'momo' },
    });
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Clear search' })); });
    act(() => { vi.advanceTimersByTime(300); });

    // The abandoned "momo" must never arrive after the clear.
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'newest', query: '' });
  });

  it('exposes the search field as a named searchbox', () => {
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange: vi.fn(),
      })
    );
    expect(screen.getByRole('searchbox', { name: 'Search listings' })).toBeDefined();
  });

  it('offers no clear button while the search field is empty', () => {
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: DEFAULT_VALUE,
        onChange: vi.fn(),
      })
    );
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  it('clears the search field and reports it', () => {
    const onChange = vi.fn();
    render(
      React.createElement(FilterBar, {
        categories: MOCK_CATEGORIES,
        value: { ...DEFAULT_VALUE, query: 'momo' },
        onChange,
      })
    );

    const clear = screen.getByRole('button', { name: 'Clear search' });
    act(() => { fireEvent.click(clear); });

    expect((screen.getByLabelText('Search listings') as HTMLInputElement).value).toBe('');
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'newest', query: '' });
  });
});
