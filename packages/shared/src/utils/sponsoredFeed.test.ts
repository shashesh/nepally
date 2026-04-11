import { describe, it, expect } from 'vitest';
import { interleaveSponsoredItems } from './sponsoredFeed';

type Item = { id: string; kind: 'post' };
type Sponsored = { id: string; kind: 'sponsored' };

const post = (id: string): Item => ({ id, kind: 'post' });
const sponsored = (id: string): Sponsored => ({ id, kind: 'sponsored' });

describe('interleaveSponsoredItems', () => {
  it('returns the original list when no sponsored items are supplied', () => {
    const result = interleaveSponsoredItems(
      [post('a'), post('b'), post('c')],
      [],
      { interval: 2 }
    );
    expect(result.map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the original list when posts are empty', () => {
    const result = interleaveSponsoredItems([], [sponsored('s1')], { interval: 2 });
    expect(result).toEqual([]);
  });

  it('injects a sponsored item after every N posts, but not past the last post', () => {
    const posts = [post('1'), post('2'), post('3'), post('4'), post('5'), post('6')];
    const sponsoreds = [sponsored('s1'), sponsored('s2'), sponsored('s3')];
    const result = interleaveSponsoredItems(posts, sponsoreds, { interval: 2 });
    // After post 6 no more posts exist, so s3 is suppressed.
    expect(result.map((x) => x.id)).toEqual(['1', '2', 's1', '3', '4', 's2', '5', '6']);
  });

  it('injects trailing sponsored when posts extend past the last boundary', () => {
    const posts = [post('1'), post('2'), post('3'), post('4'), post('5'), post('6'), post('7')];
    const sponsoreds = [sponsored('s1'), sponsored('s2'), sponsored('s3')];
    const result = interleaveSponsoredItems(posts, sponsoreds, { interval: 2 });
    expect(result.map((x) => x.id)).toEqual(['1', '2', 's1', '3', '4', 's2', '5', '6', 's3', '7']);
  });

  it('stops injecting when sponsored items are exhausted', () => {
    const posts = [post('1'), post('2'), post('3'), post('4'), post('5'), post('6')];
    const sponsoreds = [sponsored('s1')];
    const result = interleaveSponsoredItems(posts, sponsoreds, { interval: 2 });
    expect(result.map((x) => x.id)).toEqual(['1', '2', 's1', '3', '4', '5', '6']);
  });

  it('does not inject past the end of the post list', () => {
    const posts = [post('1'), post('2')];
    const sponsoreds = [sponsored('s1'), sponsored('s2')];
    const result = interleaveSponsoredItems(posts, sponsoreds, { interval: 2 });
    // After post 2, list ends — the trailing sponsored slot is suppressed.
    expect(result.map((x) => x.id)).toEqual(['1', '2']);
  });

  it('injects when total post count is a multiple of interval and more posts follow', () => {
    const posts = [post('1'), post('2'), post('3')];
    const sponsoreds = [sponsored('s1')];
    const result = interleaveSponsoredItems(posts, sponsoreds, { interval: 2 });
    expect(result.map((x) => x.id)).toEqual(['1', '2', 's1', '3']);
  });

  it('rejects non-positive intervals by returning the original list', () => {
    const posts = [post('1'), post('2')];
    const sponsoreds = [sponsored('s1')];
    expect(interleaveSponsoredItems(posts, sponsoreds, { interval: 0 })).toEqual(posts);
    expect(interleaveSponsoredItems(posts, sponsoreds, { interval: -3 })).toEqual(posts);
  });
});
