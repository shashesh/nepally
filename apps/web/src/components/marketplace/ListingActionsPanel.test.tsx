import React from 'react';
import { render, screen, fireEvent } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';
import type { MarketplaceListing } from '@nepally/shared';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

import { ListingActionsPanel } from './ListingActionsPanel';

function listing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  return {
    id: 'listing-1',
    owner_id: 'owner-1',
    title: 'Himalayan Kitchen',
    price: '$15-25',
    photos: [],
    ...overrides,
  } as unknown as MarketplaceListing;
}

function renderPanel(props: Partial<React.ComponentProps<typeof ListingActionsPanel>> = {}) {
  return render(
    <ListingActionsPanel
      listing={listing()}
      isOwner={false}
      isSaved={false}
      saving={false}
      onContact={vi.fn()}
      onToggleSave={vi.fn()}
      {...props}
    />
  );
}

describe('ListingActionsPanel', () => {
  it('shows the price when there is one', () => {
    renderPanel();
    expect(screen.getByText('$15-25')).toBeDefined();
  });

  it('omits the price when the listing has none', () => {
    renderPanel({ listing: listing({ price: null }) });
    expect(screen.queryByText('$15-25')).toBeNull();
  });

  describe('as a visitor', () => {
    it('offers Contact Seller and reports a press', () => {
      const onContact = vi.fn();
      renderPanel({ onContact });

      fireEvent.click(screen.getByRole('button', { name: 'Contact Seller' }));
      expect(onContact).toHaveBeenCalled();
    });

    it('offers a save toggle that reports a press', () => {
      const onToggleSave = vi.fn();
      renderPanel({ onToggleSave });

      fireEvent.click(screen.getByRole('button', { name: 'Save listing' }));
      expect(onToggleSave).toHaveBeenCalled();
    });

    // APG: a toggle keeps one name and lets aria-pressed carry the state.
    it('keeps one name for the save toggle and moves aria-pressed', () => {
      const { rerender } = renderPanel({ isSaved: false });
      expect(
        screen.getByRole('button', { name: 'Save listing' }).getAttribute('aria-pressed')
      ).toBe('false');

      rerender(
        <ListingActionsPanel
          listing={listing()}
          isOwner={false}
          isSaved
          saving={false}
          onContact={vi.fn()}
          onToggleSave={vi.fn()}
        />
      );

      expect(
        screen.getByRole('button', { name: 'Save listing' }).getAttribute('aria-pressed')
      ).toBe('true');
    });

    // web-ui-system.md: a control that is busy because the member just used it
    // keeps focus, so it never takes native `disabled` or Mantine's `loading`.
    it('stays focusable while the save is in flight', () => {
      const onToggleSave = vi.fn();
      renderPanel({ saving: true, onToggleSave });

      const button = screen.getByRole('button', { name: 'Save listing' }) as HTMLButtonElement;
      button.focus();
      expect(document.activeElement).toBe(button);
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    });

    it('ignores a press while the save is in flight', () => {
      const onToggleSave = vi.fn();
      renderPanel({ saving: true, onToggleSave });

      fireEvent.click(screen.getByRole('button', { name: 'Save listing' }));
      expect(onToggleSave).not.toHaveBeenCalled();
    });

    it('shows no owner controls', () => {
      renderPanel();
      expect(screen.queryByRole('link', { name: 'Edit Listing' })).toBeNull();
      expect(screen.queryByRole('link', { name: 'Promote' })).toBeNull();
    });
  });

  describe('as the owner', () => {
    it('links to editing and promoting rather than contacting', () => {
      renderPanel({ isOwner: true });

      expect(
        screen.getByRole('link', { name: 'Edit Listing' }).getAttribute('href')
      ).toBe('/marketplace/create?edit=listing-1');
      expect(
        screen.getByRole('link', { name: 'Promote' }).getAttribute('href')
      ).toBe('/marketplace/listing/promote/listing-1');
      expect(screen.queryByRole('button', { name: 'Contact Seller' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Save listing' })).toBeNull();
    });

    it('never nests a button inside a link', () => {
      const { container } = renderPanel({ isOwner: true });
      expect(container.querySelector('a button')).toBeNull();
      expect(container.querySelector('button a')).toBeNull();
    });
  });
});
