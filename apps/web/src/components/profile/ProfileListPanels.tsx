import React, { type ReactElement } from 'react';
import { Button, Stack } from '@mantine/core';
import Link from 'next/link';
import type { MarketplaceListing, Post } from '@nepally/shared';
import { ActionMenu, EmptyState, ListStates } from '../ui';
import { PostSummaryRow } from '../posts/PostSummaryRow';
import { ListingSummaryRow } from '../marketplace/ListingSummaryRow';
import { useNow } from '../../hooks/useNow';
import type { ListResource } from '../../hooks/useUserList';

/** The own profile's Posts tab. `canPost` offers "Start a post" on the empty state. */
export function OwnPostsPanel({ list, canPost }: { list: ListResource<Post>; canPost: boolean }): ReactElement {
  return (
    <ListStates
      loading={list.loading}
      loadingLabel="Loading posts…"
      error={list.error}
      onRetry={list.reload}
      isEmpty={list.items.length === 0}
      empty={
        <EmptyState
          title="You have not created any posts yet."
          action={
            canPost ? (
              <Button component={Link} href="/posts/create">
                Start a post
              </Button>
            ) : undefined
          }
        />
      }
    >
      <Stack gap="xs">
        {list.items.map((post) => (
          <PostSummaryRow key={post.id} post={post} />
        ))}
      </Stack>
    </ListStates>
  );
}

/**
 * The own profile's Listings tab. Its own component so useNow's interval runs
 * only while the tab is open: `keepMounted={false}` unmounts inactive panels.
 */
export function OwnListingsPanel({ list }: { list: ListResource<MarketplaceListing> }): ReactElement {
  const now = useNow();
  return (
    <ListStates
      loading={list.loading}
      loadingLabel="Loading listings…"
      error={list.error}
      onRetry={list.reload}
      isEmpty={list.items.length === 0}
      empty={
        <EmptyState
          title="No marketplace listings yet."
          action={
            <Button component={Link} href="/marketplace/create">
              Post a listing
            </Button>
          }
        />
      }
    >
      <Stack gap="xs">
        {list.items.map((listing) => (
          <ListingSummaryRow key={listing.id} listing={listing} owner={{ now }} />
        ))}
      </Stack>
    </ListStates>
  );
}

/** The own profile's Saved Posts tab; each row's menu offers Unsave. */
export function SavedPostsPanel({
  list,
  onUnsave,
}: {
  list: ListResource<Post>;
  onUnsave: (postId: string) => void;
}): ReactElement {
  return (
    <ListStates
      loading={list.loading}
      loadingLabel="Loading saved posts…"
      error={list.error}
      onRetry={list.reload}
      isEmpty={list.items.length === 0}
      empty={<EmptyState title="No saved posts yet." />}
    >
      <Stack gap="xs">
        {list.items.map((post) => (
          <PostSummaryRow
            key={post.id}
            post={post}
            menu={
              <ActionMenu
                label="Post options"
                items={[{ key: 'unsave', label: 'Unsave Post', onClick: () => onUnsave(post.id) }]}
              />
            }
          />
        ))}
      </Stack>
    </ListStates>
  );
}
