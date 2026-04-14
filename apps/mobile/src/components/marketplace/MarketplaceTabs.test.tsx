import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { MarketplaceTabs, type MarketplaceTabKey } from './MarketplaceTabs';

describe('MarketplaceTabs', () => {
  it('renders the three ship-v1 tabs', () => {
    const screen = render(<MarketplaceTabs active="for-you" onChange={() => {}} />);
    expect(screen.getByText('For You')).toBeTruthy();
    expect(screen.getByText('Featured')).toBeTruthy();
    expect(screen.getByText('Recent')).toBeTruthy();
  });

  it('calls onChange with the chosen key on press', () => {
    const onChange = jest.fn();
    const screen = render(<MarketplaceTabs active="for-you" onChange={onChange} />);
    fireEvent.press(screen.getByText('Featured'));
    expect(onChange).toHaveBeenCalledWith('featured' satisfies MarketplaceTabKey);
  });

  it('marks the active tab with accessibilityState.selected', () => {
    const screen = render(<MarketplaceTabs active="recent" onChange={() => {}} />);
    const recent = screen.getByLabelText('Recent tab');
    expect(recent.props.accessibilityState).toMatchObject({ selected: true });
  });
});
