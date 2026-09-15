import React from 'react';
import { render, act } from '../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll } from './useInfiniteScroll';

type ObserverCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void;
let observerCallback: ObserverCallback | null = null;

class MockIntersectionObserver {
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function Harness(props: { hasMore: boolean; loading: boolean; onLoadMore: () => void }) {
  const { sentinelRef } = useInfiniteScroll(props);
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

function intersect() {
  act(() => {
    observerCallback?.([{ isIntersecting: true }]);
  });
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads more when the sentinel becomes visible', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore loading={false} onLoadMore={onLoadMore} />);
    intersect();
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not load while a page is loading', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore loading onLoadMore={onLoadMore} />);
    intersect();
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('does not load when there are no more pages', () => {
    const onLoadMore = vi.fn();
    render(<Harness hasMore={false} loading={false} onLoadMore={onLoadMore} />);
    intersect();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
