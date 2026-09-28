import { renderHook, act } from '@testing-library/react-native';
import { getListingById, incrementListingViews } from '@nepally/shared';
import { useListing } from './useListing';

jest.mock('../config/supabase', () => ({ supabase: {} }));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
}));

jest.mock('@nepally/shared', () => ({
  getListingById: jest.fn(),
  incrementListingViews: jest.fn(async () => ({})),
  userMessage: (_error: unknown, fallback: string) => fallback,
}));

const mockGetListingById = getListingById as jest.MockedFunction<typeof getListingById>;

function listing(id: string, title: string) {
  return { id, title } as never;
}

async function settle() {
  await act(async () => {});
}

describe('useListing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads the listing and counts one view', async () => {
    mockGetListingById.mockResolvedValue({ data: listing('a', 'Rice cooker') });
    const { result } = renderHook(() => useListing('a'));
    expect(result.current.loading).toBe(true);

    await settle();

    expect(result.current.loading).toBe(false);
    expect(result.current.listing).toEqual({ id: 'a', title: 'Rice cooker' });
    expect(incrementListingViews).toHaveBeenCalledTimes(1);
  });

  it('never shows the previous listing under a new id', async () => {
    mockGetListingById.mockResolvedValueOnce({ data: listing('a', 'Rice cooker') });
    const { result, rerender } = renderHook(({ id }: { id: string }) => useListing(id), {
      initialProps: { id: 'a' },
    });
    await settle();

    let finish: (value: unknown) => void = () => {};
    mockGetListingById.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }) as never
    );
    rerender({ id: 'b' });

    expect(result.current.listing).toBeNull();
    expect(result.current.loading).toBe(true);

    await act(async () => {
      finish({ data: listing('b', 'Sofa') });
    });
    expect(result.current.listing).toEqual({ id: 'b', title: 'Sofa' });
    expect(result.current.loading).toBe(false);
  });

  it("drops the old listing's load error under a new id", async () => {
    mockGetListingById.mockResolvedValueOnce({ error: new Error('offline') } as never);
    const { result, rerender } = renderHook(({ id }: { id: string }) => useListing(id), {
      initialProps: { id: 'a' },
    });
    await settle();
    expect(result.current.loadError).toBe("Couldn't load this listing.");

    mockGetListingById.mockReturnValueOnce(new Promise(() => {}) as never);
    rerender({ id: 'b' });

    expect(result.current.loadError).toBeNull();
    expect(result.current.loading).toBe(true);
  });
});
