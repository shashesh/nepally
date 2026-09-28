import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ActiveLocationSwitcher } from './ActiveLocationSwitcher';

const mockUseLocation = jest.fn();
jest.mock('../../hooks/useLocation', () => ({ useLocation: () => mockUseLocation() }));

// Flat stub exposing the two choices the real sheet offers.
jest.mock('./LocationSwitcherSheet', () => {
  const ReactLocal = jest.requireActual('react');
  const { Text, TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    LocationSwitcherSheet: ({
      visible,
      savedLocations,
      onSelectSaved,
      onSelectDetected,
    }: {
      visible: boolean;
      savedLocations: unknown[];
      onSelectSaved: (location: unknown) => void;
      onSelectDetected: () => void;
    }) =>
      visible
        ? ReactLocal.createElement(
            View,
            null,
            ReactLocal.createElement(
              TouchableOpacity,
              { onPress: () => onSelectSaved(savedLocations[0]) },
              ReactLocal.createElement(Text, null, 'Pick saved')
            ),
            ReactLocal.createElement(
              TouchableOpacity,
              { onPress: onSelectDetected },
              ReactLocal.createElement(Text, null, 'Pick detected')
            )
          )
        : null,
  };
});

const setManualOverride = jest.fn();
const browseMetro = jest.fn();

describe('ActiveLocationSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocation.mockReturnValue({
      activeLocation: null,
      detectedLocation: { metro_area_id: 'm9', metro_name: 'Austin', metro_state: 'TX' },
      savedLocations: [
        { id: 's1', metro_area_id: 'm2', label: 'Work', metro_area: { name: 'Houston', state: 'TX' } },
      ],
      setManualOverride,
      browseMetro,
    });
  });

  it('switches to a saved location and closes', () => {
    const onClose = jest.fn();
    const screen = render(<ActiveLocationSwitcher visible onClose={onClose} />);

    fireEvent.press(screen.getByText('Pick saved'));

    expect(onClose).toHaveBeenCalled();
    expect(setManualOverride).toHaveBeenCalledWith({
      metro_area_id: 'm2',
      metro_name: 'Houston',
      metro_state: 'TX',
      source: 'saved',
      is_temporary: false,
    });
  });

  it('browses the detected metro as a visit and closes', () => {
    const onClose = jest.fn();
    const screen = render(<ActiveLocationSwitcher visible onClose={onClose} />);

    fireEvent.press(screen.getByText('Pick detected'));

    expect(onClose).toHaveBeenCalled();
    expect(browseMetro).toHaveBeenCalledWith({
      metro_area_id: 'm9',
      metro_name: 'Austin',
      metro_state: 'TX',
      source: 'gps',
      is_temporary: true,
    });
  });
});
