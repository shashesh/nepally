import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MarketplaceErrorState } from './MarketplaceErrorState';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('MarketplaceErrorState', () => {
  it('shows the message and retries on Try again', () => {
    const onRetry = jest.fn();
    const screen = render(
      <MarketplaceErrorState message="Couldn't load listings." onRetry={onRetry} />
    );

    expect(screen.getByText("Couldn't load listings.")).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('announces itself as an alert', () => {
    const screen = render(
      <MarketplaceErrorState message="Couldn't load more listings." onRetry={jest.fn()} compact />
    );
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
