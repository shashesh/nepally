import type { PostComment, PostCommentThread } from '../types/post';

function toTimestamp(value: string): number {
  return new Date(value).getTime();
}

/**
 * Build single-level comment threads for post detail views.
 *
 * Rules:
 * - Only one reply level is supported
 * - Replies are nested under top-level parent comments
 * - Missing parent replies are treated as top-level comments
 * - Threads are sorted by most recent activity (comment/reply timestamp desc)
 * - Replies are sorted oldest -> newest
 */
export function buildSingleLevelCommentThreads(comments: PostComment[]): PostCommentThread[] {
  const byId = new Map<string, PostComment>();

  comments.forEach((comment) => {
    byId.set(comment.id, comment);
  });

  const topLevel: PostComment[] = [];
  const repliesByParent = new Map<string, PostComment[]>();

  comments.forEach((comment) => {
    const parentId = comment.parent_comment_id;

    if (!parentId || !byId.has(parentId)) {
      topLevel.push(comment);
      return;
    }

    const parentReplies = repliesByParent.get(parentId) ?? [];
    parentReplies.push(comment);
    repliesByParent.set(parentId, parentReplies);
  });

  const threads = topLevel.map((parent) => {
    const replies = (repliesByParent.get(parent.id) ?? []).sort(
      (left, right) => toTimestamp(left.created_at) - toTimestamp(right.created_at)
    );

    const latestActivity = replies.length > 0 ? replies[replies.length - 1].created_at : parent.created_at;

    return {
      parent,
      replies,
      latest_activity_at: latestActivity,
    } satisfies PostCommentThread;
  });

  return threads.sort(
    (left, right) => toTimestamp(right.latest_activity_at) - toTimestamp(left.latest_activity_at)
  );
}
