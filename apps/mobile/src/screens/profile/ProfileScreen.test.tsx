import React from 'react';
import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, render, waitFor, type RenderResult } from '@testing-library/react-native';
import { ProfileScreen } from './ProfileScreen';

const mockUseAuth = jest.fn();
const mockGetMetroArea = jest.fn();
const mockGetPostsByAuthorId = jest.fn();
const mockGetSavedPostsByUserId = jest.fn();
const mockGetListingsByOwner = jest.fn();
const mockUnsavePost = jest.fn();

const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn(() => ({ single: mockSupabaseSingle }));
const mockSupabaseSelect = jest.fn(() => ({ eq: mockSupabaseEq }));
const mockSupabaseFrom = jest.fn(() => ({ select: mockSupabaseSelect }));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => children,
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), getParent: jest.fn() }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../utils/storage', () => ({
  getMetroArea: () => mockGetMetroArea(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    from: (...args: Parameters<typeof mockSupabaseFrom>) => mockSupabaseFrom(...args),
  },
}));

jest.mock('@nepally/shared', () => ({
  ...jest.requireActual('@nepally/shared'),
  getPostsByAuthorId: (...args: unknown[]) => mockGetPostsByAuthorId(...args),
  getSavedPostsByUserId: (...args: unknown[]) => mockGetSavedPostsByUserId(...args),
  getListingsByOwner: (...args: unknown[]) => mockGetListingsByOwner(...args),
  unsavePost: (...args: unknown[]) => mockUnsavePost(...args),
}));

function makeUser(metroAreaId: string | undefined) {
  return {
    id: 'user-1',
    full_name: 'Sita Sharma',
    email: 'sita@example.com',
    trust_level: 1,
    metro_area_id: metroAreaId,
    zip_code: '75001',
    profile_photo: null,
  };
}

function makePost(id: string, title: string) {
  return {
    id,
    title,
    description: `${title} description`,
    author_id: 'someone-else',
    is_global: false,
    likes_count: 0,
    comments_count: 0,
    created_at: '2026-09-01T10:00:00Z',
  };
}

function setUser(metroAreaId: string | undefined) {
  mockUseAuth.mockReturnValue({ user: makeUser(metroAreaId), signOut: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  setUser('19100');
  mockGetMetroArea.mockResolvedValue(null);
  mockSupabaseSingle.mockResolvedValue({ data: { name: 'Dallas', state: 'TX' } });
  mockGetPostsByAuthorId.mockResolvedValue({ data: [] });
  mockGetSavedPostsByUserId.mockResolvedValue({ data: [] });
  mockGetListingsByOwner.mockResolvedValue({ data: [] });
  mockUnsavePost.mockResolvedValue({ error: null });
});

describe('ProfileScreen metro label', () => {
  it('shows the cached metro without querying Supabase', async () => {
    mockGetMetroArea.mockResolvedValue({ id: '19100', name: 'Dallas-Fort Worth', state: 'TX' });
    const screen = render(<ProfileScreen />);
    fireEvent.press(screen.getByText('About'));

    await waitFor(() => {
      expect(screen.getByText('Dallas-Fort Worth, TX')).toBeTruthy();
    });
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("falls back to looking up the user's metro in Supabase", async () => {
    const screen = render(<ProfileScreen />);
    fireEvent.press(screen.getByText('About'));

    await waitFor(() => {
      expect(screen.getByText('Dallas, TX')).toBeTruthy();
    });
    expect(mockSupabaseFrom).toHaveBeenCalledWith('metro_areas');
    expect(mockSupabaseEq).toHaveBeenCalledWith('id', '19100');
  });

  it('shows a placeholder when there is no cached metro and no metro on the user', async () => {
    setUser(undefined);
    const screen = render(<ProfileScreen />);
    fireEvent.press(screen.getByText('About'));

    await waitFor(() => {
      expect(mockGetMetroArea).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('No metro area set')).toBeTruthy();
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it("reloads the label when the user's metro changes", async () => {
    const screen = render(<ProfileScreen />);
    fireEvent.press(screen.getByText('About'));
    await waitFor(() => {
      expect(screen.getByText('Dallas, TX')).toBeTruthy();
    });

    mockSupabaseSingle.mockResolvedValue({ data: { name: 'New York', state: 'NY' } });
    setUser('35620');
    screen.rerender(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.getByText('New York, NY')).toBeTruthy();
    });
    expect(mockSupabaseEq).toHaveBeenLastCalledWith('id', '35620');
  });
});

describe('ProfileScreen unsave toast', () => {
  const TOAST_VISIBLE_MS = 2200;
  const TOAST_FADE_MS = 300;
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetSavedPostsByUserId.mockResolvedValue({
      data: [makePost('post-1', 'Room for rent'), makePost('post-2', 'Rides to DFW')],
    });
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  async function renderSavedTab() {
    const screen = render(<ProfileScreen />);
    await act(async () => {});
    await act(async () => {});
    fireEvent.press(screen.getByText('Saved Posts'));
    return screen;
  }

  /** Press the post's unsave button and confirm the Alert. */
  async function unsave(screen: RenderResult, title: string) {
    fireEvent.press(screen.getByLabelText(`Unsave ${title}`));
    const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2] as AlertButton[];
    const confirm = buttons.find((button) => button.text === 'Unsave');
    await act(async () => {
      await confirm?.onPress?.();
    });
  }

  function advance(ms: number) {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  }

  it('removes the post, shows a toast, then fades the toast out', async () => {
    const screen = await renderSavedTab();

    await unsave(screen, 'Room for rent');

    expect(mockUnsavePost).toHaveBeenCalledWith(expect.anything(), 'post-1');
    expect(screen.queryByText('Room for rent')).toBeNull();
    expect(screen.getByText('Post unsaved.')).toBeTruthy();

    advance(TOAST_VISIBLE_MS);
    expect(screen.getByText('Post unsaved.')).toBeTruthy();

    advance(TOAST_FADE_MS + 100);
    expect(screen.queryByText('Post unsaved.')).toBeNull();
  });

  it('shows an error toast when unsaving fails', async () => {
    mockUnsavePost.mockResolvedValue({ error: new Error('network') });
    const screen = await renderSavedTab();

    await unsave(screen, 'Room for rent');

    expect(screen.getByText('Failed to unsave post.')).toBeTruthy();
  });

  it('keeps a new toast that arrives while the previous one is fading out', async () => {
    mockUnsavePost
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: new Error('network') });
    const screen = await renderSavedTab();

    await unsave(screen, 'Room for rent');
    // RN's jest preset ends native-driver animations 16ms after they start, so 5ms
    // after the dismiss timer fires the first toast's fade is still running.
    advance(TOAST_VISIBLE_MS + 5);
    expect(screen.getByText('Post unsaved.')).toBeTruthy();

    await unsave(screen, 'Rides to DFW');
    expect(screen.getByText('Failed to unsave post.')).toBeTruthy();

    // The new toast gets its own full display time before it fades.
    advance(TOAST_VISIBLE_MS - 1);
    expect(screen.getByText('Failed to unsave post.')).toBeTruthy();

    advance(1 + TOAST_FADE_MS + 100);
    expect(screen.queryByText('Failed to unsave post.')).toBeNull();
  });
});
