import React from 'react';
import {
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconRocket,
  IconTrash,
} from '@tabler/icons-react';
import type { MarketplaceListing } from '@nepally/shared';
import { ActionMenu, notify, useConfirm, type ActionMenuItem, type ConfirmOptions } from '../ui';
import type { ListingAction } from '../../hooks/useMyListings';

export interface MyListingActionsProps {
  listing: Pick<MarketplaceListing, 'id' | 'title' | 'status'>;
  /** An action on this row is in flight; every item is disabled until it lands. */
  pending: boolean;
  /** Runs the action; resolves false when it failed. */
  onAction: (id: string, action: ListingAction) => Promise<boolean>;
}

const CONFIRMS: Partial<Record<ListingAction, ConfirmOptions>> = {
  deactivate: {
    title: 'Deactivate this listing?',
    message: 'It will be hidden from the marketplace until you reactivate it.',
    confirmLabel: 'Deactivate',
  },
  delete: {
    title: 'Delete this listing?',
    message: "This can't be undone.",
    confirmLabel: 'Delete',
    danger: true,
  },
};

const OUTCOMES: Record<ListingAction, { done: string; verb: string }> = {
  deactivate: { done: 'Listing deactivated', verb: 'deactivate' },
  reactivate: { done: 'Listing reactivated', verb: 'reactivate' },
  refresh: { done: 'Listing refreshed', verb: 'refresh' },
  delete: { done: 'Listing deleted', verb: 'delete' },
};

const ICON_SIZE = 16;

/**
 * The owner's actions on one of their listings, as a single menu beside the
 * row. Deactivate and Delete ask first; every action reports how it went.
 */
export function MyListingActions({ listing, pending, onAction }: MyListingActionsProps) {
  const confirm = useConfirm();
  const isActive = listing.status === 'active';

  const run = async (action: ListingAction) => {
    const question = CONFIRMS[action];
    if (question && !(await confirm(question))) return;

    const ok = await onAction(listing.id, action);
    const outcome = OUTCOMES[action];
    if (ok) notify.success(outcome.done);
    else notify.error(`Couldn't ${outcome.verb} this listing. Please try again.`);
  };

  const isInactive = listing.status === 'inactive';
  const candidates: (ActionMenuItem | false)[] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: <IconPencil size={ICON_SIZE} aria-hidden="true" />,
      href: `/marketplace/create?edit=${listing.id}`,
    },
    isActive && {
      key: 'promote',
      label: 'Promote',
      icon: <IconRocket size={ICON_SIZE} aria-hidden="true" />,
      href: `/marketplace/listing/promote/${listing.id}`,
    },
    isActive && {
      key: 'refresh',
      label: 'Refresh',
      icon: <IconRefresh size={ICON_SIZE} aria-hidden="true" />,
      onClick: () => void run('refresh'),
    },
    isActive && {
      key: 'deactivate',
      label: 'Deactivate',
      icon: <IconPlayerPause size={ICON_SIZE} aria-hidden="true" />,
      onClick: () => void run('deactivate'),
    },
    isInactive && {
      key: 'reactivate',
      label: 'Reactivate',
      icon: <IconPlayerPlay size={ICON_SIZE} aria-hidden="true" />,
      onClick: () => void run('reactivate'),
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <IconTrash size={ICON_SIZE} aria-hidden="true" />,
      danger: true,
      onClick: () => void run('delete'),
    },
  ];
  const items = candidates.filter((item): item is ActionMenuItem => item !== false);

  return (
    <ActionMenu
      label={`Actions for ${listing.title}`}
      items={items.map((item) => ({ ...item, disabled: pending }))}
    />
  );
}
