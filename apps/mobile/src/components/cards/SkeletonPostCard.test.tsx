import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { SkeletonPostCard } from './SkeletonPostCard';

describe('SkeletonPostCard', () => {
  it('starts loop animation on mount', () => {
    const start = jest.fn();
    const stop = jest.fn();
    const loopSpy = jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start, stop } as unknown as Animated.CompositeAnimation);

    try {
      const { unmount } = render(<SkeletonPostCard />);

      expect(loopSpy).toHaveBeenCalledTimes(1);
      expect(start).toHaveBeenCalledTimes(1);

      unmount();
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      loopSpy.mockRestore();
    }
  });

  it('keeps the same loop running across re-renders', () => {
    const start = jest.fn();
    const stop = jest.fn();
    const loopSpy = jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start, stop } as unknown as Animated.CompositeAnimation);

    try {
      const { rerender } = render(<SkeletonPostCard />);
      rerender(<SkeletonPostCard />);

      expect(loopSpy).toHaveBeenCalledTimes(1);
      expect(stop).not.toHaveBeenCalled();
    } finally {
      loopSpy.mockRestore();
    }
  });
});

