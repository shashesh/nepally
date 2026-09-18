import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ReportPostSheet } from './ReportPostSheet';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('ReportPostSheet', () => {
  it('calls onClose when cancel is pressed', () => {
    const onClose = jest.fn();
    const screen = render(
      <ReportPostSheet
        visible
        onClose={onClose}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.press(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not submit until a reason is selected', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <ReportPostSheet
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits selected reason and details', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const screen = render(
      <ReportPostSheet
        visible
        onClose={jest.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(screen.getByLabelText('Reason Scam'));
    fireEvent.changeText(screen.getByPlaceholderText('Add anything helpful for review'), 'Requests payment before visit.');
    fireEvent.press(screen.getByText('Submit Report'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Scam', 'Requests payment before visit.');
    });
  });

  it('clears the previous reason and details when reopened', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();
    const screen = render(
      <ReportPostSheet visible onClose={onClose} onSubmit={onSubmit} />
    );

    fireEvent.press(screen.getByLabelText('Reason Spam'));
    fireEvent.changeText(screen.getByPlaceholderText('Add anything helpful for review'), 'Old details');

    screen.rerender(<ReportPostSheet visible={false} onClose={onClose} onSubmit={onSubmit} />);
    screen.rerender(<ReportPostSheet visible onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByPlaceholderText('Add anything helpful for review').props.value).toBe('');
    // No reason is selected any more, so submitting does nothing
    fireEvent.press(screen.getByText('Submit Report'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('positions the backdrop as a full-screen absolute overlay', () => {
    const screen = render(
      <ReportPostSheet
        visible
        onClose={jest.fn()}
        onSubmit={jest.fn().mockResolvedValue(undefined)}
      />
    );

    const backdrop = screen.getByTestId('report-sheet-backdrop');
    expect(StyleSheet.flatten(backdrop.props.style)).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      })
    );
  });
});
