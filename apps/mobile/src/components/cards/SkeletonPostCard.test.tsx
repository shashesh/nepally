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

    render(<SkeletonPostCard />);

    expect(loopSpy).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(1);
    loopSpy.mockRestore();
  });
});

