import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import BrowseCategoriesScreen from './BrowseCategoriesScreen';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('@nepally/shared', () => ({
  getCategories: jest.fn(async () => ({
    data: [
      { id: '1', name: 'Housing', slug: 'housing', emoji: '🏠', icon: null, color: null, description: null, sort_order: 1, created_at: '2026-01-01' },
    ],
  })),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

describe('BrowseCategoriesScreen', () => {
  it('renders categories after loading', async () => {
    const screen = render(<BrowseCategoriesScreen />);
    await waitFor(() => {
      expect(screen.getByText('Housing')).toBeTruthy();
    });
  });
});
