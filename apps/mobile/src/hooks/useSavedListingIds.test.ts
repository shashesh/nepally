import { Alert } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { getUserSavedListingIds, saveListing, unsaveListing } from '@nepally/shared';
import { useSavedListingIds } from './useSavedListingIds';

jest.mock('../config/supabase', () => ({ supabase: {} }));

jest.mock('@nepally/shared', () => ({
  getUserSavedListingIds: jest.fn(),
  saveListing: jest.fn(),
  unsaveListing: jest.fn(),
}));

const mockGetIds = getUserSavedListingIds as jest.MockedFunction<typeof getUserSavedListingIds>;
const mockSave = saveListing as jest.MockedFunction<typeof saveListing>;
const mockUnsave = unsaveListing as jest.MockedFunction<typeof unsaveListing>;

async function settle() {
  await act(async () => {});
}

/** `null` renders signed out; omitted renders as member u1. */
async function renderIds(userId: string | null = 'u1') {
  const hook = renderHook(({ id }: { id: string | undefined }) => useSavedListingIds(id), {
    initialProps: { id: userId ?? undefined },
  });
  await settle();
  return hook;
}

describe('useSavedListingIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetIds.mockResolvedValue({ data: ['a'] });
    mockSave.mockResolvedValue({});
    mockUnsave.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads the member's saved ids", async () => {
    const { result } = await renderIds();

    expect(mockGetIds).toHaveBeenCalledWith(expect.anything(), 'u1');
    expect(result.current.savedIds.has('a')).toBe(true);
  });

  it('loads nothing when signed out', async () => {
    const { result } = await renderIds(null);

    expect(mockGetIds).not.toHaveBeenCalled();
    expect(result.current.savedIds.size).toBe(0);
  });

  it('saves at once, then confirms with the server', async () => {
    const { result } = await renderIds();

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.toggle('b');
    });

    expect(mockSave).toHaveBeenCalledWith(expect.anything(), 'b');
    expect(result.current.savedIds.has('b')).toBe(true);
    expect(saved).toBe(true);
  });

  it('unsaves a saved listing', async () => {
    const { result } = await renderIds();

    await act(async () => {
      await result.current.toggle('a');
    });

    expect(mockUnsave).toHaveBeenCalledWith(expect.anything(), 'a');
    expect(result.current.savedIds.has('a')).toBe(false);
  });

  it('puts the heart back and says so when the save fails', async () => {
    mockSave.mockResolvedValueOnce({ error: new Error('offline') });
    const { result } = await renderIds();

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.toggle('b');
    });

    expect(result.current.savedIds.has('b')).toBe(false);
    expect(saved).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('Error', "Couldn't update your saved listings. Try again.");
  });

  it('ignores a second tap on the same listing while the first is in flight', async () => {
    let finish: (value: { error?: Error }) => void = () => {};
    mockSave.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    const { result } = await renderIds();

    act(() => {
      void result.current.toggle('b');
      void result.current.toggle('b');
    });
    await act(async () => finish({}));

    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockUnsave).not.toHaveBeenCalled();
    expect(result.current.savedIds.has('b')).toBe(true);
  });

  it('unsaves when asked to, even before the saved ids have loaded', async () => {
    mockGetIds.mockReturnValueOnce(new Promise(() => {}));
    const { result } = await renderIds();
    expect(result.current.savedIds.size).toBe(0);

    let stuck: boolean | undefined;
    await act(async () => {
      stuck = await result.current.setSaved('a', false);
    });

    expect(mockUnsave).toHaveBeenCalledWith(expect.anything(), 'a');
    expect(mockSave).not.toHaveBeenCalled();
    expect(stuck).toBe(true);
  });

  it('refetches on reload', async () => {
    const { result } = await renderIds();
    mockGetIds.mockResolvedValueOnce({ data: ['a', 'c'] });

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.savedIds.has('c')).toBe(true);
  });
});
