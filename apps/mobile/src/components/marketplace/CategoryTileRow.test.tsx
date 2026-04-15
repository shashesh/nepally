import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import type { MarketplaceCategory } from '@nepally/shared';
import { CategoryTileRow } from './CategoryTileRow';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const categories: MarketplaceCategory[] = [
  { id: '1', name: 'Housing', slug: 'housing', emoji: '🏠', icon: null, color: '#4CAF50', description: null, sort_order: 1, created_at: '2026-01-01' },
  { id: '2', name: 'Jobs', slug: 'jobs', emoji: '💼', icon: null, color: '#1976D2', description: null, sort_order: 2, created_at: '2026-01-01' },
];

describe('CategoryTileRow', () => {
  it('renders each category name', () => {
    const screen = render(<CategoryTileRow categories={categories} selectedSlug="" onSelect={() => {}} />);
    expect(screen.getByText('Housing')).toBeTruthy();
    expect(screen.getByText('Jobs')).toBeTruthy();
  });

  it('calls onSelect with the slug when a tile is pressed', () => {
    const onSelect = jest.fn();
    const screen = render(<CategoryTileRow categories={categories} selectedSlug="" onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText('Filter by Jobs'));
    expect(onSelect).toHaveBeenCalledWith('jobs');
  });

  it('calls onSelect with empty string when the selected tile is pressed again', () => {
    const onSelect = jest.fn();
    const screen = render(<CategoryTileRow categories={categories} selectedSlug="jobs" onSelect={onSelect} />);
    fireEvent.press(screen.getByLabelText('Filter by Jobs'));
    expect(onSelect).toHaveBeenCalledWith('');
  });
});
