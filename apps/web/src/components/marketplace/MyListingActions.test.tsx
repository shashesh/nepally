import React from 'react';
import type { MarketplaceListing } from '@nepally/shared';
import { render, screen, fireEvent, waitFor, within } from '../../test-utils';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ListingAction } from '../../hooks/useMyListings';
import { MyListingActions } from './MyListingActions';

const mocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../ui/notify', () => ({ notify: mocks }));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

function listing(status: MarketplaceListing['status'] = 'active'): MarketplaceListing {
  return { id: 'listing-1', title: 'Momo catering', status } as unknown as MarketplaceListing;
}

async function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Momo catering' }));
  await screen.findByRole('menu');
}

async function choose(name: string) {
  await openMenu();
  fireEvent.click(screen.getByRole('menuitem', { name }));
}

describe('MyListingActions', () => {
  let onAction: Mock<(id: string, action: ListingAction) => Promise<boolean>>;

  beforeEach(() => {
    vi.clearAllMocks();
    onAction = vi.fn<(id: string, action: ListingAction) => Promise<boolean>>().mockResolvedValue(true);
  });

  it('offers every action on an active listing', async () => {
    render(<MyListingActions listing={listing()} pending={false} onAction={onAction} />);
    await openMenu();

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      'Edit',
      'Promote',
      'Refresh',
      'Deactivate',
      'Delete',
    ]);
  });

  it('offers reactivate, not promote or refresh, on an inactive listing', async () => {
    render(<MyListingActions listing={listing('inactive')} pending={false} onAction={onAction} />);
    await openMenu();

    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Edit', 'Reactivate', 'Delete']);
  });

  it('links to the edit form and the promote wizard', async () => {
    render(<MyListingActions listing={listing()} pending={false} onAction={onAction} />);
    await openMenu();

    expect(screen.getByRole('menuitem', { name: 'Edit' }).getAttribute('href')).toBe('/marketplace/create?edit=listing-1');
    expect(screen.getByRole('menuitem', { name: 'Promote' }).getAttribute('href')).toBe(
      '/marketplace/listing/promote/listing-1'
    );
  });

  it('does nothing when the deactivate dialog is cancelled', async () => {
    render(<MyListingActions listing={listing()} pending={false} onAction={onAction} />);
    await choose('Deactivate');

    const dialog = await screen.findByRole('dialog', { name: 'Deactivate this listing?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onAction).not.toHaveBeenCalled();
  });

  it('deactivates once confirmed, and says so', async () => {
    render(<MyListingActions listing={listing()} pending={false} onAction={onAction} />);
    await choose('Deactivate');

    const dialog = await screen.findByRole('dialog', { name: 'Deactivate this listing?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(onAction).toHaveBeenCalledWith('listing-1', 'deactivate'));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Listing deactivated'));
  });

  it('starts the delete dialog on Cancel, and deletes once confirmed', async () => {
    render(<MyListingActions listing={listing()} pending={false} onAction={onAction} />);
    await choose('Delete');

    const dialog = await screen.findByRole('dialog', { name: 'Delete this listing?' });
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' })));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onAction).toHaveBeenCalledWith('listing-1', 'delete'));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Listing deleted'));
  });

  it('reactivates and refreshes without asking', async () => {
    const { unmount } = render(<MyListingActions listing={listing('inactive')} pending={false} onAction={onAction} />);
    await choose('Reactivate');
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('listing-1', 'reactivate'));
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    render(<MyListingActions listing={listing()} pending={false} onAction={onAction} />);
    await choose('Refresh');
    await waitFor(() => expect(onAction).toHaveBeenCalledWith('listing-1', 'refresh'));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Listing refreshed'));
  });

  it('says so when an action fails', async () => {
    onAction.mockResolvedValue(false);
    render(<MyListingActions listing={listing()} pending={false} onAction={onAction} />);
    await choose('Refresh');

    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith("Couldn't refresh this listing. Please try again.")
    );
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('disables every item while an action is in flight', async () => {
    render(<MyListingActions listing={listing()} pending onAction={onAction} />);
    await openMenu();

    for (const item of screen.getAllByRole('menuitem')) {
      expect((item as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
