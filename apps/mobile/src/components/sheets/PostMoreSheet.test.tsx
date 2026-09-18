import React from 'react';
import { Animated } from 'react-native';
import { act, fireEvent, render, type RenderResult } from '@testing-library/react-native';
import { PostMoreSheet } from './PostMoreSheet';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

/**
 * A single-touch responder event. PanResponder derives dy from the
 * previous/current page Y of the touch, so this simulates one move of `toY - fromY`.
 */
function touchEvent(fromY: number, toY: number, timestamp: number) {
  return {
    nativeEvent: { touches: [{}], changedTouches: [{}] },
    touchHistory: {
      numberActiveTouches: 1,
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      touchBank: [
        {
          touchActive: true,
          startPageX: 0,
          startPageY: fromY,
          startTimeStamp: 0,
          currentPageX: 0,
          currentPageY: toY,
          currentTimeStamp: timestamp,
          previousPageX: 0,
          previousPageY: fromY,
          previousTimeStamp: 0,
        },
      ],
    },
  };
}

/**
 * Drag the sheet down by `distance` slowly (low velocity), then release.
 * The sheet only claims the responder on a vertical move (its start handler returns
 * false), and RNTL's fireEvent skips responder events on such views, so the pan
 * handlers are invoked directly — the same calls the native responder system makes.
 */
function dragSheetDown(screen: RenderResult, distance: number) {
  const sheet = screen.getByTestId('post-more-sheet');
  act(() => {
    sheet.props.onResponderGrant(touchEvent(0, 0, 1));
    sheet.props.onResponderMove(touchEvent(0, distance, 1000));
    sheet.props.onResponderRelease(touchEvent(distance, distance, 1001));
  });
}

describe('PostMoreSheet', () => {
  it('renders own-post actions and handles edit', () => {
    const onClose = jest.fn();
    const onEdit = jest.fn();
    const screen = render(
      <PostMoreSheet
        visible
        isOwnPost
        onClose={onClose}
        onEdit={onEdit}
        onDelete={jest.fn()}
        onShare={jest.fn()}
      />
    );

    expect(screen.getByText('Edit Post')).toBeTruthy();
    expect(screen.queryByText('Report Post')).toBeNull();

    fireEvent.press(screen.getByText('Edit Post'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('renders viewer actions including save and report', () => {
    const onClose = jest.fn();
    const onReport = jest.fn();
    const onSave = jest.fn();
    const screen = render(
      <PostMoreSheet
        visible
        isOwnPost={false}
        onClose={onClose}
        onReport={onReport}
        onSave={onSave}
        onShare={jest.fn()}
      />
    );

    expect(screen.getByText('Save Post')).toBeTruthy();
    expect(screen.getByText('Report Post')).toBeTruthy();
    expect(screen.queryByText('Delete Post')).toBeNull();

    fireEvent.press(screen.getByText('Report Post'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('shows unsave label when post is already saved', () => {
    const screen = render(
      <PostMoreSheet
        visible
        isOwnPost={false}
        onClose={jest.fn()}
        onSave={jest.fn()}
        isSaved
      />
    );

    expect(screen.getByText('Unsave Post')).toBeTruthy();
  });

  describe('drag to dismiss', () => {
    it('closes when dragged down past the threshold', () => {
      const onClose = jest.fn();
      const screen = render(<PostMoreSheet visible isOwnPost={false} onClose={onClose} />);

      dragSheetDown(screen, 120);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('springs back without closing on a short drag', () => {
      const start = jest.fn();
      const springSpy = jest
        .spyOn(Animated, 'spring')
        .mockReturnValue({ start } as unknown as Animated.CompositeAnimation);

      try {
        const onClose = jest.fn();
        const screen = render(<PostMoreSheet visible isOwnPost={false} onClose={onClose} />);

        dragSheetDown(screen, 30);

        expect(onClose).not.toHaveBeenCalled();
        expect(springSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
        expect(start).toHaveBeenCalledTimes(1);
      } finally {
        springSpy.mockRestore();
      }
    });

    it('calls the latest onClose after the parent re-renders with a new one', () => {
      const firstOnClose = jest.fn();
      const latestOnClose = jest.fn();
      const screen = render(<PostMoreSheet visible isOwnPost={false} onClose={firstOnClose} />);
      screen.rerender(<PostMoreSheet visible isOwnPost={false} onClose={latestOnClose} />);

      dragSheetDown(screen, 120);

      expect(firstOnClose).not.toHaveBeenCalled();
      expect(latestOnClose).toHaveBeenCalledTimes(1);
    });
  });
});

