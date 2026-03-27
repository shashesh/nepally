import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { LocationSwitcherSheet } from './LocationSwitcherSheet';

const mockNavigate = jest.fn();

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@nepally/shared', () => ({
  getShortMetroName: (name: string) => name,
  MAX_SAVED_LOCATIONS_PREMIUM: 5,
  hasMetroChanged: (a: string, b: string) => a !== b,
}));

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  savedLocations: [
    {
      id: 'loc-1',
      user_id: 'user-1',
      label: 'Home',
      metro_area_id: '35620',
      zip_code: '10001',
      is_default: true,
      sort_order: 0,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z',
      metro_area: { id: '35620', name: 'New York-Newark-Jersey City', state: 'NY' },
    },
  ],
  activeLocation: {
    metro_area_id: '35620',
    metro_name: 'New York-Newark-Jersey City',
    metro_state: 'NY',
    source: 'saved' as const,
    is_temporary: false,
  },
  detectedLocation: {
    metro_area_id: '19100',
    metro_name: 'Dallas-Fort Worth-Arlington',
    metro_state: 'TX',
    zip_code: '75001',
    source: 'gps' as const,
  },
  onSelectSaved: jest.fn(),
  onSelectDetected: jest.fn(),
};

describe('LocationSwitcherSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders saved location and selects it', () => {
    const screen = render(<LocationSwitcherSheet {...baseProps} />);
    fireEvent.press(screen.getByText('Home'));
    expect(baseProps.onSelectSaved).toHaveBeenCalledWith(baseProps.savedLocations[0]);
  });

  it('renders detected location section and handles select', () => {
    const screen = render(<LocationSwitcherSheet {...baseProps} />);
    expect(screen.getByText('DETECTED LOCATION')).toBeTruthy();
    fireEvent.press(screen.getByText("You're currently near"));
    expect(baseProps.onSelectDetected).toHaveBeenCalledTimes(1);
  });

  it('navigates to AddLocation and closes', () => {
    const screen = render(<LocationSwitcherSheet {...baseProps} />);
    fireEvent.press(screen.getByText('Add a Location'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('AddLocation');
  });

  it('navigates to ManageLocations and closes', () => {
    const screen = render(<LocationSwitcherSheet {...baseProps} />);
    fireEvent.press(screen.getByText('Manage Locations'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('ManageLocations');
  });
});

