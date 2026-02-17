/**
 * Post data types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_initial_schema.sql, 003_post_interactions.sql
 */

import type { UserSummary } from './user';

export type PostCategory = 'housing' | 'jobs' | 'emergency' | 'travel';
export type PostStatus = 'active' | 'expired' | 'removed' | 'pending';

export interface Post {
  id: string;
  author_id: string;
  category: PostCategory;

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

  // Category-specific fields (JSONB)
  fields: Record<string, any>;

  // Status
  status: PostStatus;
  expiry_date: string;

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

/** API result wrappers */
export interface PostsResult {
  data?: Post[];
  error?: Error;
}

export interface PostResult {
  data?: Post;
  error?: Error;
}
