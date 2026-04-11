/**
 * Pure helpers for weaving sponsored listings into a feed stream.
 *
 * The home feed renders user posts, but paid `sponsored_feed` promotions need
 * to be interleaved every N posts. Keeping the merge logic here (instead of
 * inside the mobile/web feed screens) means both platforms share the same
 * ordering rules and the logic is unit-testable without a React renderer.
 */

export interface InterleaveOptions {
  /** Insert one sponsored item after every `interval` posts. */
  interval: number;
}

/**
 * Interleave sponsored items into a post list every `interval` posts.
 *
 * Rules:
 *   - A sponsored slot only materializes if there is still a post after it.
 *     This prevents a trailing sponsored card from sitting alone below the
 *     feed after the user has run out of posts.
 *   - Sponsored items are consumed in order and never reused.
 *   - Non-positive intervals are treated as a no-op.
 */
export function interleaveSponsoredItems<P, S>(
  posts: readonly P[],
  sponsored: readonly S[],
  options: InterleaveOptions
): Array<P | S> {
  const { interval } = options;

  if (interval <= 0 || sponsored.length === 0 || posts.length === 0) {
    return [...posts];
  }

  const result: Array<P | S> = [];
  let sponsoredIdx = 0;

  for (let i = 0; i < posts.length; i++) {
    result.push(posts[i]);

    const isBoundary = (i + 1) % interval === 0;
    const hasMorePosts = i + 1 < posts.length;
    const hasMoreSponsored = sponsoredIdx < sponsored.length;

    if (isBoundary && hasMorePosts && hasMoreSponsored) {
      result.push(sponsored[sponsoredIdx]);
      sponsoredIdx += 1;
    }
  }

  return result;
}
