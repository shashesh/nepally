import React from 'react';
import { Animated, StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';
import { ListingGridCardSkeleton } from './ListingGridCardSkeleton';

describe('ListingGridCardSkeleton', () => {
  it('runs the shimmer loop while mounted and stops it on unmount', () => {
    const start = jest.fn();
    const stop = jest.fn();
    const loopSpy = jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start, stop } as unknown as Animated.CompositeAnimation);

    try {
      const { unmount } = render(<ListingGridCardSkeleton width={160} />);

      expect(loopSpy).toHaveBeenCalledTimes(1);
      expect(start).toHaveBeenCalledTimes(1);
      expect(stop).not.toHaveBeenCalled();

      unmount();
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      loopSpy.mockRestore();
    }
  });

  it('keeps the same shimmer loop across re-renders', () => {
    const start = jest.fn();
    const stop = jest.fn();
    const loopSpy = jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start, stop } as unknown as Animated.CompositeAnimation);

    try {
      const { rerender } = render(<ListingGridCardSkeleton width={160} />);
      rerender(<ListingGridCardSkeleton width={200} />);

      expect(loopSpy).toHaveBeenCalledTimes(1);
      expect(stop).not.toHaveBeenCalled();
    } finally {
      loopSpy.mockRestore();
    }
  });

  it('matches the grid cell width', () => {
    const screen = render(<ListingGridCardSkeleton width={180} />);

    const card = screen.getByLabelText('Loading listing');
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({ width: 180 });
  });
});
