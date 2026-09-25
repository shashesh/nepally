import React from 'react';
import { formatRelativeTime, highlightSegments } from '@nepally/shared';
import type { MarketplaceListing, PersonSearchResult, Post } from '@nepally/shared';
import Avatar from '../Avatar';
import { ScopeBadge, TagChip, TrustBadge } from '../ui';
import styles from './SearchResultItem.module.css';

export type SearchResult =
  | { kind: 'post'; post: Post }
  | { kind: 'listing'; listing: MarketplaceListing }
  | { kind: 'person'; person: PersonSearchResult };

export function getSearchResultHref(result: SearchResult): string {
  if (result.kind === 'post') return `/posts/${result.post.id}`;
  if (result.kind === 'listing') return `/marketplace/listing/${result.listing.id}`;
  return `/users/${result.person.id}`;
}

export function Highlight({ text, query }: { text: string; query: string | null }) {
  return (
    <>
      {highlightSegments(text, query).map((segment, index) =>
        segment.match ? (
          <mark key={index} className={styles.mark}>
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        )
      )}
    </>
  );
}

export interface SearchResultItemProps {
  result: SearchResult;
  query: string | null;
  /** Dense single-line layout for the suggestion dropdown. */
  compact?: boolean;
}

/** Visual content of one result. Callers provide the link or combobox option around it. */
export function SearchResultItem({ result, query, compact = false }: SearchResultItemProps) {
  const rootClass = compact ? `${styles.root} ${styles.compact}` : styles.root;

  if (result.kind === 'post') {
    const { post } = result;
    const firstTag = post.tags?.[0];
    return (
      <div className={rootClass}>
        <div className={styles.body}>
          <span className={styles.title}>
            <Highlight text={post.title} query={query} />
          </span>
          <span className={styles.meta}>
            {post.author?.full_name ? `${post.author.full_name} · ` : ''}
            {formatRelativeTime(new Date(post.created_at))}
          </span>
          {!compact ? (
            <span className={styles.chips}>
              {post.tags?.map((tag) => <TagChip key={tag.id} slug={tag.slug} label={tag.name} />)}
              <ScopeBadge isGlobal={post.is_global} />
            </span>
          ) : null}
        </div>
        {compact && firstTag ? <span className={styles.aside}>{firstTag.name}</span> : null}
      </div>
    );
  }

  if (result.kind === 'listing') {
    const { listing } = result;
    const photo = listing.photos?.[0];
    return (
      <div className={rootClass}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className={styles.thumb} />
        ) : (
          <span className={styles.thumb} aria-hidden="true" />
        )}
        <div className={styles.body}>
          <span className={styles.title}>
            <Highlight text={listing.title} query={query} />
          </span>
          {!compact && listing.category?.name ? <span className={styles.meta}>{listing.category.name}</span> : null}
        </div>
        {listing.price ? <span className={styles.price}>{listing.price}</span> : null}
      </div>
    );
  }

  const { person } = result;
  return (
    <div className={rootClass}>
      <Avatar
        name={person.full_name}
        photoUrl={person.profile_photo}
        trustLevel={person.trust_level}
        size={compact ? 'small' : 'medium'}
        decorative
      />
      <div className={styles.body}>
        <span className={styles.title}>
          <Highlight text={person.full_name} query={query} />
        </span>
        <span className={styles.meta}>
          {person.is_local ? 'In your metro · ' : ''}
          {person.follower_count} {person.follower_count === 1 ? 'follower' : 'followers'}
        </span>
      </div>
      <TrustBadge level={person.trust_level} />
    </div>
  );
}
