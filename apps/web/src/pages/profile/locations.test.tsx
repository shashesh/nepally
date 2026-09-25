import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  logClientEventMock: vi.fn(),
  notificationsShowMock: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: locationsMocks.notificationsShowMock },
}));
vi.mock('../../hooks/useAuth', () => ({ useAuth: locationsMocks.useAuthMock }));
vi.mock('../../hooks/useLocation', () => ({ useLocation: locationsMocks.useLocationMock }));
vi.mock('next/router', () => ({ useRouter: locationsMocks.useRouterMock }));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));
vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    updateSavedLocation: locationsMocks.updateSavedLocationMock,
    deleteSavedLocation: locationsMocks.deleteSavedLocationMock,
    setDefaultSavedLocation: locationsMocks.setDefaultSavedLocationMock,
    addSavedLocation: locationsMocks.addSavedLocationMock,
    searchMetroAreas: locationsMocks.searchMetroAreasMock,
    getMetroByZip: locationsMocks.getMetroByZipMock,
    isValidZipCode: locationsMocks.isValidZipCodeMock,
    logClientEvent: locationsMocks.logClientEventMock,
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

  async function renderPage() {
    render(<ManageLocationsPage />);
    await act(async () => {});
  }

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
    mockRefreshSavedLocations.mockResolvedValue(undefined);
  });

  // Belt and suspenders alongside openAddAndSelectMetro's own try/finally: if
  // a test throws while fake timers are active, they must not leak into
  // whichever test runs next.
  afterEach(() => {
    vi.useRealTimers();
  });

  it('redirects to /login when user is not logged in', async () => {
    locationsMocks.useAuthMock.mockReturnValue({ user: null });
    render(<ManageLocationsPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
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

  it('names each row\'s actions with the location label', async () => {
    await renderPage();
    expect(screen.getByRole('button', { name: 'Rename Home' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove Work' })).toBeDefined();
  });

  it('shows Add a Location button when below the location limit', () => {
    render(<ManageLocationsPage />);
    expect(screen.getByText('＋ Add a Location')).toBeDefined();
  });

  it('shows the add location form when the Add button is clicked', async () => {
    render(<ManageLocationsPage />);
    fireEvent.click(screen.getByText('＋ Add a Location'));
    await waitFor(() => {
      expect(screen.getByText('Add a Location')).toBeDefined();
      expect(screen.getByLabelText('Search by metro name or ZIP code')).toBeDefined();
    });
  });

  // ─── Rename: page calls the real API and refreshes ───────────

  it('calls updateSavedLocation and refreshes on a successful rename', async () => {
    locationsMocks.updateSavedLocationMock.mockResolvedValue({});
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Office' } });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(locationsMocks.updateSavedLocationMock).toHaveBeenCalledWith(
      expect.anything(),
      'loc-2',
      { label: 'Office' }
    );
    expect(mockRefreshSavedLocations).toHaveBeenCalled();
  });

  it('logs and does not refresh when a rename fails', async () => {
    locationsMocks.updateSavedLocationMock.mockResolvedValue({ error: new Error('offline') });
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Rename Work' }));
    const input = screen.getByLabelText('Rename location Work');
    fireEvent.change(input, { target: { value: 'Office' } });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(locationsMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_location_rename_failed' })
    );
    expect(mockRefreshSavedLocations).not.toHaveBeenCalled();
  });

  // ─── Remove ─────────────────────────────────────────────────

  it('confirms before removing a location, and does not delete when cancelled', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Work' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove this location?' });
    expect(within(dialog).getByText(/"Work" will no longer appear/)).toBeDefined();

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    });

    expect(locationsMocks.deleteSavedLocationMock).not.toHaveBeenCalled();
  });

  it('deletes the location once the removal is confirmed', async () => {
    locationsMocks.deleteSavedLocationMock.mockResolvedValue({});
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Work' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove this location?' });

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    });

    expect(locationsMocks.deleteSavedLocationMock).toHaveBeenCalledWith(expect.anything(), 'loc-2');
    expect(mockRefreshSavedLocations).toHaveBeenCalled();
  });

  it('toasts when removing a location fails', async () => {
    locationsMocks.deleteSavedLocationMock.mockResolvedValue({ error: new Error('offline') });
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Work' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove this location?' });

    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    });

    expect(locationsMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Couldn't remove this location", color: 'red' })
    );
  });

  it('moves focus to the neighboring row\'s Rename button once the removal refresh lands', async () => {
    const threeLocations = [
      mockSavedLocations[0],
      mockSavedLocations[1],
      {
        id: 'loc-3',
        label: 'Family',
        metro_area_id: '31080',
        is_default: false,
        metro_area: { name: 'Los Angeles', state: 'CA' },
      },
    ];
    locationsMocks.useLocationMock.mockReturnValue({
      savedLocations: threeLocations,
      refreshSavedLocations: mockRefreshSavedLocations,
    });
    locationsMocks.deleteSavedLocationMock.mockResolvedValue({});
    const { rerender } = render(<ManageLocationsPage />);
    await act(async () => {});

    fireEvent.click(screen.getByRole('button', { name: 'Remove Work' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove this location?' });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    });

    // Simulates the LocationContext's own refresh landing with the shortened list.
    locationsMocks.useLocationMock.mockReturnValue({
      savedLocations: [threeLocations[0], threeLocations[2]],
      refreshSavedLocations: mockRefreshSavedLocations,
    });
    await act(async () => {
      rerender(<ManageLocationsPage />);
    });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Family' }));
  });

  // ─── Set as default ───────────────────────────────────────────

  it('sets default location when Set as default is clicked', async () => {
    locationsMocks.setDefaultSavedLocationMock.mockResolvedValue({});
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

  it('toasts when setting a default location fails', async () => {
    locationsMocks.setDefaultSavedLocationMock.mockResolvedValue({ error: new Error('offline') });
    await renderPage();

    await act(async () => {
      fireEvent.click(screen.getByText('Set as default'));
    });

    expect(locationsMocks.notificationsShowMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Couldn't set this as your default location", color: 'red' })
    );
    expect(mockRefreshSavedLocations).not.toHaveBeenCalled();
  });

  it('moves focus to the row\'s own Rename button once the set-default refresh lands', async () => {
    locationsMocks.setDefaultSavedLocationMock.mockResolvedValue({});
    const { rerender } = render(<ManageLocationsPage />);
    await act(async () => {});

    await act(async () => {
      fireEvent.click(screen.getByText('Set as default'));
    });

    locationsMocks.useLocationMock.mockReturnValue({
      savedLocations: [
        { ...mockSavedLocations[0], is_default: false },
        { ...mockSavedLocations[1], is_default: true },
      ],
      refreshSavedLocations: mockRefreshSavedLocations,
    });
    await act(async () => {
      rerender(<ManageLocationsPage />);
    });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Work' }));
  });

  // ─── Add: page calls the real API, refreshes, and closes the form ──

  async function openAddAndSelectMetro() {
    fireEvent.click(screen.getByText('＋ Add a Location'));
    locationsMocks.searchMetroAreasMock.mockResolvedValue({
      data: [{ id: '41940', name: 'San Jose', state: 'CA' }],
    });
    const searchInput = await screen.findByLabelText('Search by metro name or ZIP code');
    // The search is debounced (useMetroSearch, SEARCH_DEBOUNCE_MS): fake
    // timers advance past that pause, matching useSearchSuggestions.test.tsx.
    vi.useFakeTimers();
    try {
      fireEvent.change(searchInput, { target: { value: 'San Jo' } });
      await act(async () => {
        vi.advanceTimersByTime(250);
      });
    } finally {
      vi.useRealTimers();
    }
    fireEvent.click(screen.getByRole('button', { name: 'San Jose, CA' }));
    await screen.findByLabelText('Name this location');
  }

  it('closes the add form from its search step and returns focus to Add a Location', async () => {
    await renderPage();
    fireEvent.click(screen.getByText('＋ Add a Location'));
    await screen.findByLabelText('Search by metro name or ZIP code');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByLabelText('Search by metro name or ZIP code')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Add a Location/ }));
  });

  it('saves a new location through addSavedLocation, refreshes, and closes the form', async () => {
    locationsMocks.addSavedLocationMock.mockResolvedValue({ data: { id: 'loc-3' } });
    await renderPage();
    await openAddAndSelectMetro();

    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Save Location'));
    });

    expect(locationsMocks.addSavedLocationMock).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      '41940',
      'Family'
    );
    expect(mockRefreshSavedLocations).toHaveBeenCalled();
    expect(screen.queryByLabelText('Name this location')).toBeNull();
    expect(screen.getByText('＋ Add a Location')).toBeDefined();
  });

  it('returns focus to Add a Location after save when the form was still mounted during the refresh', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = () => resolve();
    });
    mockRefreshSavedLocations.mockReturnValue(refreshPromise);
    locationsMocks.addSavedLocationMock.mockResolvedValue({ data: { id: 'loc-3' } });
    const { rerender } = render(<ManageLocationsPage />);
    await act(async () => {});
    await openAddAndSelectMetro();

    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });
    const saveButton = screen.getByRole('button', { name: 'Save Location' });
    saveButton.focus();

    const savePromise = act(async () => {
      fireEvent.click(saveButton);
    });

    locationsMocks.useLocationMock.mockReturnValue({
      savedLocations: [
        ...mockSavedLocations,
        {
          id: 'loc-3',
          label: 'Family',
          metro_area_id: '41940',
          is_default: false,
          metro_area: { name: 'San Jose', state: 'CA' },
        },
      ],
      refreshSavedLocations: mockRefreshSavedLocations,
    });
    await act(async () => {
      rerender(<ManageLocationsPage />);
    });

    resolveRefresh?.();
    await savePromise;

    expect(screen.queryByLabelText('Name this location')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Add a Location/ }));
  });

  it('returns focus to Add a Location when the add succeeds but the refresh brings no new list', async () => {
    // LocationContext's refresh swallows its own failure: it resolves, and
    // savedLocations stays as it was. Only the form closing changes the page.
    mockRefreshSavedLocations.mockResolvedValue(undefined);
    locationsMocks.addSavedLocationMock.mockResolvedValue({ data: { id: 'loc-3' } });
    await renderPage();
    await openAddAndSelectMetro();

    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });
    const saveButton = screen.getByRole('button', { name: 'Save Location' });
    saveButton.focus();
    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(screen.queryByLabelText('Name this location')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /Add a Location/ }));
  });

  it('shows error when saving a duplicate label, without calling addSavedLocation', async () => {
    await renderPage();
    await openAddAndSelectMetro();

    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Home' } });
    fireEvent.click(screen.getByText('Save Location'));

    await waitFor(() => {
      expect(screen.getByText(/You already have a location named "Home"/)).toBeDefined();
    });
    expect(locationsMocks.addSavedLocationMock).not.toHaveBeenCalled();
  });

  it('shows our copy, never the raw error, and logs profile_location_add_failed when addSavedLocation fails', async () => {
    const error = new Error('new row violates row-level security policy');
    locationsMocks.addSavedLocationMock.mockResolvedValue({ error });
    await renderPage();
    await openAddAndSelectMetro();

    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Family' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Save Location'));
    });

    expect(locationsMocks.logClientEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'profile_location_add_failed', error })
    );
    expect(screen.getByText("Couldn't add this location. Please try again.")).toBeDefined();
    expect(screen.queryByText(/row-level security/)).toBeNull();
    expect(mockRefreshSavedLocations).not.toHaveBeenCalled();
  });

  it('falls back to the new row\'s Rename button when the location cap hides the Add button', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = () => resolve();
    });
    mockRefreshSavedLocations.mockReturnValue(refreshPromise);
    const fourLocations = [
      mockSavedLocations[0],
      mockSavedLocations[1],
      {
        id: 'loc-3',
        label: 'Family',
        metro_area_id: '31080',
        is_default: false,
        metro_area: { name: 'Los Angeles', state: 'CA' },
      },
      {
        id: 'loc-4',
        label: 'School',
        metro_area_id: '41940',
        is_default: false,
        metro_area: { name: 'San Jose', state: 'CA' },
      },
    ];
    locationsMocks.useLocationMock.mockReturnValue({
      savedLocations: fourLocations,
      refreshSavedLocations: mockRefreshSavedLocations,
    });
    locationsMocks.addSavedLocationMock.mockResolvedValue({ data: { id: 'loc-5' } });
    const { rerender } = render(<ManageLocationsPage />);
    await act(async () => {});
    await openAddAndSelectMetro();

    fireEvent.change(screen.getByLabelText('Name this location'), { target: { value: 'Fifth' } });
    const saveButton = screen.getByRole('button', { name: 'Save Location' });
    saveButton.focus();
    const savePromise = act(async () => {
      fireEvent.click(saveButton);
    });

    // Simulates the refresh landing at the cap — the Add button no longer renders.
    locationsMocks.useLocationMock.mockReturnValue({
      savedLocations: [
        ...fourLocations,
        {
          id: 'loc-5',
          label: 'Fifth',
          metro_area_id: '41940',
          is_default: false,
          metro_area: { name: 'San Jose', state: 'CA' },
        },
      ],
      refreshSavedLocations: mockRefreshSavedLocations,
    });
    await act(async () => {
      rerender(<ManageLocationsPage />);
    });
    resolveRefresh?.();
    await savePromise;

    expect(screen.queryByText('＋ Add a Location')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Rename Fifth' }));
  });
});
