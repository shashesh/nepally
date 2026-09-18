import { useEffect } from 'react';
import { useIntersection } from '@mantine/hooks';

export interface UseInfiniteScrollOptions {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** Start loading before the sentinel is on screen. */
  rootMargin?: string;
}

/** Calls onLoadMore when a sentinel element after the list scrolls into view. */
export function useInfiniteScroll({ hasMore, loading, onLoadMore, rootMargin = '400px' }: UseInfiniteScrollOptions) {
  const { ref, entry } = useIntersection<HTMLDivElement>({ rootMargin });
  const isIntersecting = entry?.isIntersecting ?? false;

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  return { sentinelRef: ref };
}
