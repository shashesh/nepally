import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { MarketplaceMenuSheet } from './MarketplaceMenuSheet';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('MarketplaceMenuSheet', () => {
  it('does not render content when hidden', () => {
    const screen = render(
      <MarketplaceMenuSheet
        visible={false}
        onClose={() => {}}
        onSelect={() => {}}
      />
    );
    expect(screen.queryByText('My Listings')).toBeNull();
  });

  it('renders all six rows when visible', () => {
    const screen = render(
      <MarketplaceMenuSheet visible={true} onClose={() => {}} onSelect={() => {}} />
    );
    expect(screen.getByText('My Listings')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.getByText('Promote a Listing')).toBeTruthy();
    expect(screen.getByText('Browse Categories')).toBeTruthy();
    expect(screen.getByText('Change Location')).toBeTruthy();
    expect(screen.getByText('Marketplace Rules')).toBeTruthy();
  });

  it('calls onSelect with the row key and then onClose', () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    const screen = render(
      <MarketplaceMenuSheet visible={true} onClose={onClose} onSelect={onSelect} />
    );
    fireEvent.press(screen.getByText('My Listings'));
    expect(onSelect).toHaveBeenCalledWith('my-listings');
    expect(onClose).toHaveBeenCalled();
  });
});
