import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PERMISSION_BANNER_MAX_SHOWS } from '@nepally/shared';
import { LocationPermissionBanner } from './LocationPermissionBanner';

const mockGetLocationPermissionStatus = jest.fn();
const mockGetPermissionBannerState = jest.fn();
const mockSavePermissionBannerState = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../../services/location', () => ({
  getLocationPermissionStatus: () => mockGetLocationPermissionStatus(),
}));

jest.mock('../../utils/storage', () => ({
  getPermissionBannerState: () => mockGetPermissionBannerState(),
  savePermissionBannerState: (...args: unknown[]) => mockSavePermissionBannerState(...args),
}));

const BANNER_TEXT = /Enable location for a better experience/;

describe('LocationPermissionBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLocationPermissionStatus.mockResolvedValue('denied');
    mockGetPermissionBannerState.mockResolvedValue({ show_count: 0, last_shown_at: null });
    mockSavePermissionBannerState.mockResolvedValue(undefined);
  });

  it('shows the banner when permission is denied and it has not been shown yet', async () => {
    const screen = render(<LocationPermissionBanner />);

    await waitFor(() => {
      expect(screen.getByText(BANNER_TEXT)).toBeTruthy();
    });
  });

  it('stays hidden and skips the stored state when permission is not denied', async () => {
    mockGetLocationPermissionStatus.mockResolvedValue('granted');
    const screen = render(<LocationPermissionBanner />);

    await waitFor(() => {
      expect(mockGetLocationPermissionStatus).toHaveBeenCalledTimes(1);
    });
    expect(mockGetPermissionBannerState).not.toHaveBeenCalled();
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it('stays hidden once the maximum number of shows is reached', async () => {
    mockGetPermissionBannerState.mockResolvedValue({
      show_count: PERMISSION_BANNER_MAX_SHOWS,
      last_shown_at: null,
    });
    const screen = render(<LocationPermissionBanner />);

    await waitFor(() => {
      expect(mockGetPermissionBannerState).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
  });

  it('opens settings when Turn On is pressed', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    const screen = render(<LocationPermissionBanner />);

    await waitFor(() => {
      expect(screen.getByText('Turn On')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('Turn On'));

    expect(openSettings).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
  });

  it('hides on dismiss and records the show in storage', async () => {
    const screen = render(<LocationPermissionBanner />);
    await waitFor(() => {
      expect(screen.getByText(BANNER_TEXT)).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Dismiss location banner'));

    expect(screen.queryByText(BANNER_TEXT)).toBeNull();
    await waitFor(() => {
      expect(mockSavePermissionBannerState).toHaveBeenCalledWith({
        show_count: 1,
        last_shown_at: expect.any(String),
      });
    });
  });
});
