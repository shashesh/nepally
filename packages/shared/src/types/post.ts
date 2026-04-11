/**
 * Post data types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_schema.sql
 */

import type { UserSummary } from './user';

// ── Tag System ──────────────────────────────────────────────────────
/** A tag loaded from the `tags` table */
export interface Tag {
  id: string;
  name: string;        // e.g. "Housing"
  slug: string;        // e.g. "housing"
  icon: string | null; // e.g. "home" or emoji
  color: string | null; // hex e.g. "#4CAF50"
  description: string | null;
  is_system: boolean;
  requires_moderation: boolean;
  sort_order: number;
  created_at: string;
}

/** Row in the `post_tags` junction table */
export interface PostTag {
  id: number;
  post_id: string;
  tag_id: string;
}

// ── Post ────────────────────────────────────────────────────────────
export type PostStatus = 'active' | 'removed' | 'pending';

export interface Post {
  id: string;
  author_id: string;

  // Location
  metro_area_id: string;
  location_zip_code: string;
  location_city: string;
  location_state: string;
  location_lat?: number;
  location_lng?: number;

  // Content
  title: string;
  description: string;
  photos: string[];

  // Global / Premium
  is_global: boolean;

  // Status
  status: PostStatus;

  // Engagement
  views_count: number;
  responses_count: number;
  reports_count: number;
  likes_count: number;
  comments_count: number;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Joined data (optional, from API queries)
  author?: UserSummary;

  /** Tags joined via post_tags → tags. Populated by feed/detail queries. */
  tags?: Tag[];
}

/** Post like */
export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

/** Post comment */
export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  is_deleted: boolean;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;

  // Joined data
  author?: UserSummary;
}

/** Single-level thread for post detail rendering */
export interface PostCommentThread {
  parent: PostComment;
  replies: PostComment[];
  latest_activity_at: string;
}

/** API result wrappers */
export interface PostsResult {
  data?: Post[];
  error?: Error;
  hasMore?: boolean;
}

export interface PostResult {
  data?: Post;
  error?: Error;
}

export interface TagsResult {
  data?: Tag[];
  error?: Error;
}
