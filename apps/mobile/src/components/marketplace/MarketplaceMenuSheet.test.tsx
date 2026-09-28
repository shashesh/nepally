import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import { Modal } from 'react-native';
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

  it('renders the five rows when visible, with no Promote entry', () => {
    const screen = render(
      <MarketplaceMenuSheet visible={true} onClose={() => {}} onSelect={() => {}} />
    );
    expect(screen.getByText('My Listings')).toBeTruthy();
    expect(screen.getByText('Saved')).toBeTruthy();
    expect(screen.queryByText('Promote a Listing')).toBeNull();
    expect(screen.getByText('Browse Categories')).toBeTruthy();
    expect(screen.getByText('Change Location')).toBeTruthy();
    expect(screen.getByText('Marketplace Rules')).toBeTruthy();
  });

  it('keeps the sheet mounted while hidden, so closing can animate', () => {
    const screen = render(
      <MarketplaceMenuSheet visible={false} onClose={() => {}} onSelect={() => {}} />
    );
    const modal = screen.UNSAFE_getByType(Modal);
    expect(modal.props.visible).toBe(false);
    // A fade keeps the dimmed backdrop still instead of sliding it up with the sheet.
    expect(modal.props.animationType).toBe('fade');
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
