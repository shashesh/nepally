import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { MarketplaceTabs, type MarketplaceTabKey } from './MarketplaceTabs';

describe('MarketplaceTabs', () => {
  it('renders the four ship-v1 tabs', () => {
    const screen = render(<MarketplaceTabs active="sponsored" onChange={() => {}} />);
    expect(screen.getByText('Sponsored')).toBeTruthy();
    expect(screen.getByText('Featured')).toBeTruthy();
    expect(screen.getByText('Trending')).toBeTruthy();
    expect(screen.getByText('All Listings')).toBeTruthy();
  });

  it('calls onChange with the chosen key on press', () => {
    const onChange = jest.fn();
    const screen = render(<MarketplaceTabs active="sponsored" onChange={onChange} />);
    fireEvent.press(screen.getByText('Featured'));
    expect(onChange).toHaveBeenCalledWith('featured' satisfies MarketplaceTabKey);
  });

  it('calls onChange with "trending" when Trending is pressed', () => {
    const onChange = jest.fn();
    const screen = render(<MarketplaceTabs active="sponsored" onChange={onChange} />);
    fireEvent.press(screen.getByText('Trending'));
    expect(onChange).toHaveBeenCalledWith('trending' satisfies MarketplaceTabKey);
  });

  it('calls onChange with "all" when All Listings is pressed', () => {
    const onChange = jest.fn();
    const screen = render(<MarketplaceTabs active="sponsored" onChange={onChange} />);
    fireEvent.press(screen.getByText('All Listings'));
    expect(onChange).toHaveBeenCalledWith('all' satisfies MarketplaceTabKey);
  });

  it('marks the active tab with accessibilityState.selected', () => {
    const screen = render(<MarketplaceTabs active="trending" onChange={() => {}} />);
    const trending = screen.getByLabelText('Trending tab');
    expect(trending.props.accessibilityState).toMatchObject({ selected: true });
  });
});
