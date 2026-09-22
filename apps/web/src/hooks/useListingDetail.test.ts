import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getListingById,
  getUserSavedListingIds,
  incrementListingViews,
  saveListing,
  unsaveListing,
  type MarketplaceListing,
} from '@nepally/shared';
import { useListingDetail } from './useListingDetail';

vi.mock('@nepally/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getListingById: vi.fn(),
  getUserSavedListingIds: vi.fn(),
  incrementListingViews: vi.fn(),
  saveListing: vi.fn(),
  unsaveListing: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

const mockGetListing = getListingById as ReturnType<typeof vi.fn>;
const mockGetSavedIds = getUserSavedListingIds as ReturnType<typeof vi.fn>;
const mockIncrementViews = incrementListingViews as ReturnType<typeof vi.fn>;
const mockSave = saveListing as ReturnType<typeof vi.fn>;
const mockUnsave = unsaveListing as ReturnType<typeof vi.fn>;

const VIEWER = { id: 'viewer-1' };

function listing(id = 'listing-1'): MarketplaceListing {
  return { id, title: `Listing ${id}`, photos: [] } as unknown as MarketplaceListing;
}

describe('useListingDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetListing.mockResolvedValue({ data: listing() });
    mockGetSavedIds.mockResolvedValue({ data: [] });
    mockIncrementViews.mockResolvedValue({});
    mockSave.mockResolvedValue({});
    mockUnsave.mockResolvedValue({});
  });

  it('loads the listing', async () => {
    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.listing?.id).toBe('listing-1');
    expect(result.current.error).toBeNull();
    expect(result.current.notFound).toBe(false);
  });

  it('counts the view once the listing is there', async () => {
    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockIncrementViews).toHaveBeenCalledWith(expect.anything(), 'listing-1');
  });

  // recon 6: a failed read used to render as "Listing not found."
  it('tells a failed read apart from a missing listing', async () => {
    mockGetListing.mockResolvedValue({ error: new Error('network down') });

    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(result.current.notFound).toBe(false);
    expect(result.current.listing).toBeNull();
  });

  it('reports a genuinely missing listing as not found', async () => {
    mockGetListing.mockResolvedValue({
      error: new Error('Listing not found'),
      notFound: true,
    });

    const { result } = renderHook(() => useListingDetail('missing', VIEWER));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notFound).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('does not count a view for a listing that failed to load', async () => {
    mockGetListing.mockResolvedValue({ error: new Error('network down') });
    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockIncrementViews).not.toHaveBeenCalled();
  });

  // recon 6: the old effect had no cancel guard at all.
  it('drops a response for an id the viewer has already left', async () => {
    let resolveStale: ((value: unknown) => void) | undefined;
    mockGetListing.mockImplementationOnce(
      () => new Promise((resolve) => { resolveStale = resolve; })
    );

    const { result, rerender } = renderHook(({ id }) => useListingDetail(id, VIEWER), {
      initialProps: { id: 'listing-1' },
    });

    mockGetListing.mockResolvedValue({ data: listing('listing-2') });
    rerender({ id: 'listing-2' });
    await waitFor(() => expect(result.current.listing?.id).toBe('listing-2'));

    await act(async () => {
      resolveStale?.({ data: listing('listing-1') });
    });

    expect(result.current.listing?.id).toBe('listing-2');
  });

  it('starts clean when the id changes', async () => {
    const { result, rerender } = renderHook(({ id }) => useListingDetail(id, VIEWER), {
      initialProps: { id: 'listing-1' },
    });
    await waitFor(() => expect(result.current.listing?.id).toBe('listing-1'));

    mockGetListing.mockResolvedValue({ error: new Error('network down') });
    rerender({ id: 'listing-2' });

    await waitFor(() => expect(result.current.error).toBe('network down'));
    // The previous listing must not still be on screen under the new id.
    expect(result.current.listing).toBeNull();
  });

  it('reflects that the viewer already saved this listing', async () => {
    mockGetSavedIds.mockResolvedValue({ data: ['listing-1'] });

    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));

    await waitFor(() => expect(result.current.isSaved).toBe(true));
  });

  it('still shows the listing when the saved lookup fails', async () => {
    mockGetSavedIds.mockResolvedValue({ error: new Error('saved lookup down') });

    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.listing?.id).toBe('listing-1');
    expect(result.current.error).toBeNull();
  });

  it('saves and unsaves, and leaves the flag alone when the write fails', async () => {
    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.toggleSave(); });
    expect(mockSave).toHaveBeenCalledWith(expect.anything(), 'listing-1');
    expect(result.current.isSaved).toBe(true);

    mockUnsave.mockResolvedValue({ error: new Error('write failed') });
    await act(async () => { result.current.toggleSave(); });
    expect(result.current.isSaved).toBe(true);
  });

  it('ignores a second press while a save is in flight', async () => {
    let finishSave: ((value: unknown) => void) | undefined;
    mockSave.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));

    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => { result.current.toggleSave(); });
    act(() => { result.current.toggleSave(); });
    expect(mockSave).toHaveBeenCalledTimes(1);

    await act(async () => { finishSave?.({}); });
  });

  it('asks for nothing without an id', async () => {
    const { result } = renderHook(() => useListingDetail(undefined, VIEWER));

    await act(async () => {});
    expect(mockGetListing).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('reloads on demand', async () => {
    const { result } = renderHook(() => useListingDetail('listing-1', VIEWER));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetListing.mockResolvedValue({ data: { ...listing(), title: 'Renamed' } });
    act(() => { result.current.reload(); });

    await waitFor(() => expect(result.current.listing?.title).toBe('Renamed'));
  });
});
