import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { MetroConfirmationScreen } from './MetroConfirmationScreen';

const mockNavigate = jest.fn();
const mockUseRoute = jest.fn();
const mockUpdateLocation = jest.fn();
const mockRefreshUser = jest.fn();
const mockAddSavedLocation = jest.fn();
const mockSupabase = { from: jest.fn() };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('../../hooks/useMetroArea', () => ({
  useMetroArea: () => ({ updateLocation: mockUpdateLocation }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ refreshUser: mockRefreshUser }),
}));

jest.mock('../../config/supabase', () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock('@nepally/shared', () => ({
  addSavedLocation: (...args: unknown[]) => mockAddSavedLocation(...args),
}));

const ROUTE_PARAMS = {
  userId: 'user-1',
  zipCode: '75001',
  metroAreaId: '19100',
  metroName: 'Dallas-Fort Worth, TX',
};

const AUTO_ADVANCE_MS = 2000;

describe('MetroConfirmationScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockUseRoute.mockReturnValue({ params: ROUTE_PARAMS });
    mockUpdateLocation.mockResolvedValue(true);
    mockRefreshUser.mockResolvedValue(undefined);
    mockAddSavedLocation.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('shows the confirmed metro name', () => {
    const screen = render(<MetroConfirmationScreen />);

    expect(screen.getByText('Dallas-Fort Worth, TX')).toBeTruthy();
  });

  it('saves the location, refreshes the user and creates the Home saved location', async () => {
    render(<MetroConfirmationScreen />);
    await act(async () => {});
    await act(async () => {});

    expect(mockUpdateLocation).toHaveBeenCalledWith('user-1', '75001', '19100');
    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    expect(mockAddSavedLocation).toHaveBeenCalledWith(
      mockSupabase,
      'user-1',
      '19100',
      'Home',
      '75001',
      true
    );
  });

  it('does not save anything when route params are missing', () => {
    mockUseRoute.mockReturnValue({ params: undefined });
    render(<MetroConfirmationScreen />);

    expect(mockUpdateLocation).not.toHaveBeenCalled();
    expect(mockAddSavedLocation).not.toHaveBeenCalled();
  });

  it('moves on to the tutorial automatically after two seconds', () => {
    render(<MetroConfirmationScreen />);

    act(() => {
      jest.advanceTimersByTime(AUTO_ADVANCE_MS - 1);
    });
    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockNavigate).toHaveBeenCalledWith('Tutorial');
  });

  it('moves on to the tutorial immediately when Continue is pressed', () => {
    const screen = render(<MetroConfirmationScreen />);

    fireEvent.press(screen.getByText('Continue'));

    expect(mockNavigate).toHaveBeenCalledWith('Tutorial');
  });

  it('cancels the auto-advance when the screen unmounts', () => {
    const screen = render(<MetroConfirmationScreen />);
    screen.unmount();

    act(() => {
      jest.advanceTimersByTime(AUTO_ADVANCE_MS);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
