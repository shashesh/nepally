import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { FilterBar, type FilterBarValue } from './FilterBar';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@nepally/shared', () => ({}));

const CATEGORIES = [
  {
    id: 'cat-1',
    name: 'Food & Restaurants',
    slug: 'food-restaurants',
    emoji: '🍜',
    icon: 'restaurant',
    color: '#FF6B35',
    description: null,
    sort_order: 1,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: 'Professional Services',
    slug: 'professional-services',
    emoji: '💼',
    icon: 'briefcase',
    color: '#2196F3',
    description: null,
    sort_order: 2,
    created_at: '2025-01-01T00:00:00Z',
  },
];

const defaultValue: FilterBarValue = { category: '', sort: 'newest', query: '' };

describe('FilterBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders all categories label by default', () => {
    const { getByText } = render(
      <FilterBar categories={CATEGORIES} value={defaultValue} onChange={jest.fn()} />
    );
    expect(getByText('All Categories')).toBeTruthy();
  });

  it('renders selected category label', () => {
    const { getByText } = render(
      <FilterBar
        categories={CATEGORIES}
        value={{ ...defaultValue, category: 'food-restaurants' }}
        onChange={jest.fn()}
      />
    );
    expect(getByText(/Food & Restaurants/)).toBeTruthy();
  });

  it('renders current sort label', () => {
    const { getByText } = render(
      <FilterBar
        categories={CATEGORIES}
        value={{ ...defaultValue, sort: 'featured' }}
        onChange={jest.fn()}
      />
    );
    expect(getByText('Sort: Featured')).toBeTruthy();
  });

  it('opens category sheet and selects a category', () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = render(
      <FilterBar categories={CATEGORIES} value={defaultValue} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Category filter'));
    fireEvent.press(getByText(/Professional Services/));
    expect(onChange).toHaveBeenCalledWith({
      category: 'professional-services',
      sort: 'newest',
      query: '',
    });
  });

  it('opens sort sheet and selects a sort option', () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = render(
      <FilterBar categories={CATEGORIES} value={defaultValue} onChange={onChange} />
    );
    fireEvent.press(getByLabelText('Sort filter'));
    fireEvent.press(getByText('Price ↑'));
    expect(onChange).toHaveBeenCalledWith({
      category: '',
      sort: 'price_asc',
      query: '',
    });
  });

  it('disables category when lockedCategory is set', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <FilterBar
        categories={CATEGORIES}
        value={{ ...defaultValue, category: 'food-restaurants' }}
        onChange={onChange}
        lockedCategory="food-restaurants"
      />
    );
    fireEvent.press(getByLabelText('Category filter'));
    // Sheet should NOT open, so onChange never called
    expect(onChange).not.toHaveBeenCalled();
  });

  it('debounces search input', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <FilterBar
        categories={CATEGORIES}
        value={defaultValue}
        onChange={onChange}
        searchDebounceMs={300}
      />
    );
    fireEvent.changeText(getByLabelText('Search listings'), 'momo');
    expect(onChange).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'newest', query: 'momo' });
  });

  it('clears search when clear button pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <FilterBar
        categories={CATEGORIES}
        value={{ ...defaultValue, query: 'momo' }}
        onChange={onChange}
      />
    );
    fireEvent.press(getByLabelText('Clear search'));
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'newest', query: '' });
  });

  it('syncs search text when value.query changes externally', () => {
    const { getByLabelText, rerender } = render(
      <FilterBar categories={CATEGORIES} value={defaultValue} onChange={jest.fn()} />
    );
    rerender(
      <FilterBar
        categories={CATEGORIES}
        value={{ ...defaultValue, query: 'dal bhat' }}
        onChange={jest.fn()}
      />
    );
    expect(getByLabelText('Search listings').props.value).toBe('dal bhat');
  });

  it('debounced search uses the latest filter value and keeps the typed text', () => {
    const onChange = jest.fn();
    const { getByLabelText, rerender } = render(
      <FilterBar categories={CATEGORIES} value={defaultValue} onChange={onChange} />
    );
    fireEvent.changeText(getByLabelText('Search listings'), 'momo');
    // Parent changes sort while the search debounce is still pending
    rerender(
      <FilterBar
        categories={CATEGORIES}
        value={{ ...defaultValue, sort: 'price_asc' }}
        onChange={onChange}
      />
    );
    expect(getByLabelText('Search listings').props.value).toBe('momo');
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledWith({ category: '', sort: 'price_asc', query: 'momo' });
  });
});
