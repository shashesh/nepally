import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocationContext } from '../contexts/LocationContext';
import { useLocation } from './useLocation';

describe('useLocation', () => {
  it('returns default context (activeLocation null) when outside LocationProvider', () => {
    let captured: ReturnType<typeof useLocation> | undefined;
    function TestComponent() {
      captured = useLocation();
      return null;
    }
    render(React.createElement(TestComponent));
    expect(captured?.activeLocation).toBeNull();
  });

  it('returns provided context value when inside LocationProvider', () => {
    const mockContext = {
      activeLocation: {
        metro_area_id: '19100',
        metro_name: 'Dallas-Fort Worth-Arlington',
        metro_state: 'TX',
        source: 'saved' as const,
        is_temporary: false,
      },
      detectedLocation: null,
      savedLocations: [],
      showChangePrompt: false,
      browseMetro: () => {},
      updateMetroPermanent: async () => {},
      snoozeMetro: () => {},
      setManualOverride: () => {},
      dismissChangePrompt: () => {},
      refreshSavedLocations: async () => {},
      checkLocationChange: async () => {},
    };

    let captured: ReturnType<typeof useLocation> | undefined;
    function TestComponent() {
      captured = useLocation();
      return null;
    }

    render(
      React.createElement(
        LocationContext.Provider,
        { value: mockContext },
        React.createElement(TestComponent)
      )
    );

    expect(captured?.activeLocation?.metro_area_id).toBe('19100');
    expect(captured?.savedLocations).toEqual([]);
  });
});
