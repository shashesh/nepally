import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const locationsMocks = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useLocationMock: vi.fn(),
  useRouterMock: vi.fn(),
  updateSavedLocationMock: vi.fn(),
  deleteSavedLocationMock: vi.fn(),
  setDefaultSavedLocationMock: vi.fn(),
  addSavedLocationMock: vi.fn(),
  searchMetroAreasMock: vi.fn(),
  getMetroByZipMock: vi.fn(),
  isValidZipCodeMock: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: locationsMocks.useAuthMock }));
vi.mock('../../hooks/useLocation', () => ({ useLocation: locationsMocks.useLocationMock }));
vi.mock('next/router', () => ({ useRouter: locationsMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nusa/shared', async () => {
  const actual = await vi.importActual<object>('@nusa/shared');
  return {
    ...actual,
    updateSavedLocation: locationsMocks.updateSavedLocationMock,
    deleteSavedLocation: locationsMocks.deleteSavedLocationMock,
    setDefaultSavedLocation: locationsMocks.setDefaultSavedLocationMock,
    addSavedLocation: locationsMocks.addSavedLocationMock,
    searchMetroAreas: locationsMocks.searchMetroAreasMock,
    getMetroByZip: locationsMocks.getMetroByZipMock,
    isValidZipCode: locationsMocks.isValidZipCodeMock,
    MAX_SAVED_LOCATIONS_PREMIUM: 5,
    SUGGESTED_LOCATION_LABELS: ['Home', 'Work', 'Family'],
  };
});
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const mockSavedLocations = [
  {
    id: 'loc-1',
    label: 'Home',
    metro_area_id: '19100',
    is_default: true,
    metro_area: { name: 'Dallas-Fort Worth', state: 'TX' },
  },
  {
    id: 'loc-2',
    label: 'Work',
    metro_area_id: '35620',
    is_default: false,
    metro_area: { name: 'New York', state: 'NY' },
  },
];

const mockUser = { id: 'user-1' };

import ManageLocationsPage from './locations.page';

describe('ManageLocationsPage', () => {
  const mockReplace = vi.fn();
  const mockRefreshSavedLocations = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    locationsMocks.useRouterMock.mockReturnValue({
      replace: mockReplace,
      query: {},
    });
    locationsMocks.useAuthMock.mockReturnValue({ user: mockUser });
    locationsMocks.useLocationMock.mockReturnValue({
      savedLocations: mockSavedLocations,
      refreshSavedLocations: mockRefreshSavedLocations,
    });
    locationsMocks.isValidZipCodeMock.mockReturnValue(false);
  });

  it('redirects to /login when user is not logged in', () => {
    locationsMocks.useAuthMock.mockReturnValue({ user: null });
    render(<ManageLocationsPage />);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('renders the Manage Locations heading', () => {
    render(<ManageLocationsPage />);
    expect(screen.getByText('Manage Locations')).toBeDefined();
  });

  it('renders the saved location count', () => {
    render(<ManageLocationsPage />);
    expect(screen.getByText('2 of 5')).toBeDefined();
  });

  it('renders each saved location with label and metro', () => {
    render(<ManageLocationsPage />);
    expect(screen.getByText('Home')).toBeDefined();
    expect(screen.getByText('Dallas-Fort Worth, TX')).toBeDefined();
    expect(screen.getByText('Work')).toBeDefined();
    expect(screen.getByText('New York, NY')).toBeDefined();
  });

  it('shows star icon for the default location', () => {
    render(<ManageLocationsPage />);
    expect(screen.getByText('⭐')).toBeDefined();
  });

  it('shows Set as default button for non-default locations', () => {
    render(<ManageLocationsPage />);
    expect(screen.getByText('Set as default')).toBeDefined();
  });

  it('sets default location when Set as default is clicked', async () => {
    locationsMocks.setDefaultSavedLocationMock.mockResolvedValue({});
    mockRefreshSavedLocations.mockResolvedValue(undefined);
    render(<ManageLocationsPage />);
    fireEvent.click(screen.getByText('Set as default'));
    await waitFor(() => {
      expect(locationsMocks.setDefaultSavedLocationMock).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        'loc-2'
      );
      expect(mockRefreshSavedLocations).toHaveBeenCalled();
    });
  });

  it('shows Add a Location button when below the location limit', () => {
    render(<ManageLocationsPage />);
    expect(screen.getByText('＋ Add a Location')).toBeDefined();
  });

  it('shows the add location section when Add button is clicked', async () => {
    render(<ManageLocationsPage />);
    fireEvent.click(screen.getByText('＋ Add a Location'));
    await waitFor(() => {
      expect(screen.getByText('Add a Location')).toBeDefined();
      expect(screen.getByTitle('Search by metro name or ZIP code')).toBeDefined();
    });
  });

  it('searches metro areas as user types', async () => {
    locationsMocks.searchMetroAreasMock.mockResolvedValue({
      data: [{ id: '41940', name: 'San Jose', state: 'CA' }],
    });
    render(<ManageLocationsPage />);
    fireEvent.click(screen.getByText('＋ Add a Location'));
    const searchInput = await screen.findByTitle('Search by metro name or ZIP code');
    fireEvent.change(searchInput, { target: { value: 'San Jo' } });
    await waitFor(() => {
      expect(screen.getByText('San Jose, CA')).toBeDefined();
    });
  });

  it('shows label input and suggestion chips after selecting a metro', async () => {
    locationsMocks.searchMetroAreasMock.mockResolvedValue({
      data: [{ id: '41940', name: 'San Jose', state: 'CA' }],
    });
    render(<ManageLocationsPage />);
    fireEvent.click(screen.getByText('＋ Add a Location'));
    const searchInput = await screen.findByTitle('Search by metro name or ZIP code');
    fireEvent.change(searchInput, { target: { value: 'San Jo' } });
    await waitFor(() => expect(screen.getByText('San Jose, CA')).toBeDefined());
    fireEvent.click(screen.getByText('San Jose, CA'));
    await waitFor(() => {
      expect(screen.getByLabelText('Name this location')).toBeDefined();
    });
  });

  it('shows error when saving a duplicate label', async () => {
    locationsMocks.searchMetroAreasMock.mockResolvedValue({
      data: [{ id: '41940', name: 'San Jose', state: 'CA' }],
    });
    render(<ManageLocationsPage />);
    fireEvent.click(screen.getByText('＋ Add a Location'));
    const searchInput = await screen.findByTitle('Search by metro name or ZIP code');
    fireEvent.change(searchInput, { target: { value: 'San' } });
    await waitFor(() => expect(screen.getByText('San Jose, CA')).toBeDefined());
    fireEvent.click(screen.getByText('San Jose, CA'));
    const labelInput = await screen.findByLabelText('Name this location');
    fireEvent.change(labelInput, { target: { value: 'Home' } }); // 'Home' already exists
    fireEvent.click(screen.getByText('Save Location'));
    await waitFor(() => {
      expect(screen.getByText(/You already have a location named "Home"/)).toBeDefined();
    });
  });
});
