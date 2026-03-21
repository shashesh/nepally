import React from 'react';
import { render, screen, fireEvent } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useRouterMock: vi.fn(),
  useLocationMock: vi.fn(),
}));

vi.mock('next/router', () => ({
  useRouter: mocks.useRouterMock,
}));

vi.mock('../hooks/useLocation', () => ({
  useLocation: mocks.useLocationMock,
}));

import LocationSwitcher from './LocationSwitcher';

describe('LocationSwitcher', () => {
  const pushMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useRouterMock.mockReturnValue({
      push: pushMock,
    });

    mocks.useLocationMock.mockReturnValue({
      activeLocation: {
        metro_area_id: 'm1',
        metro_name: 'New York',
        metro_state: 'NY',
        source: 'saved',
        is_temporary: false,
      },
      detectedLocation: null,
      savedLocations: [
        {
          id: 'loc-1',
          label: 'Home',
          metro_area_id: 'm1',
          is_default: true,
          metro_area: {
            id: 'm1',
            name: 'New York',
            state: 'NY',
          },
        },
      ],
      setManualOverride: vi.fn(),
      browseMetro: vi.fn(),
    });
  });

  it('renders the location trigger with metro name', () => {
    render(<LocationSwitcher />);
    expect(screen.getByLabelText(/Current location/i)).toBeDefined();
  });

  it('opens the dropdown and shows saved locations', () => {
    render(<LocationSwitcher />);
    fireEvent.click(screen.getByLabelText(/Current location/i));
    expect(screen.getByText('Your Locations')).toBeDefined();
    expect(screen.getByText('Home')).toBeDefined();
  });
});
