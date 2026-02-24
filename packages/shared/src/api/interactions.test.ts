import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createComment,
  getUserLikedPostIds,
  likePost,
  unlikePost,
} from './interactions';

describe('interactions api', () => {
  it('returns auth error when liking without user', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: vi.fn(),
    } as unknown as SupabaseClient;

    const result = await likePost(supabase, 'post-1');

    expect(result.error?.message).toContain('Not authenticated');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('maps liked rows to post ID list', async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockResolvedValue({
      data: [{ post_id: 'p1' }, { post_id: 'p2' }],
      error: null,
    });

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await getUserLikedPostIds(supabase, 'user-1');

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(['p1', 'p2']);
  });

  it('creates trimmed comment payload and supports unlike', async () => {
    const postCommentsBuilder = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    };

    postCommentsBuilder.insert.mockReturnValue(postCommentsBuilder);
    postCommentsBuilder.select.mockReturnValue(postCommentsBuilder);
    postCommentsBuilder.single.mockResolvedValue({
      data: { id: 'c1', content: 'hello' },
      error: null,
    });

    const postLikesDeleteBuilder = {
      eq: vi.fn(),
    };

    postLikesDeleteBuilder.eq
      .mockReturnValueOnce(postLikesDeleteBuilder)
      .mockResolvedValueOnce({ error: null });

    const postLikesBuilder = {
      delete: vi.fn().mockReturnValue(postLikesDeleteBuilder),
    };

    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-2' } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'post_comments') return postCommentsBuilder;
        if (table === 'post_likes') return postLikesBuilder;
        throw new Error(`Unexpected table: ${table}`);
      }),
    } as unknown as SupabaseClient;

    const commentResult = await createComment(supabase, 'post-9', '  hello  ');
    const unlikeResult = await unlikePost(supabase, 'post-9');

    expect(commentResult.error).toBeUndefined();
    expect(postCommentsBuilder.insert).toHaveBeenCalledWith({
      post_id: 'post-9',
      author_id: 'user-2',
      content: 'hello',
      parent_comment_id: null,
    });
    expect(unlikeResult.error).toBeUndefined();
  });
});
