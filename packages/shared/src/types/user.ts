/**
 * User data types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_schema.sql
 */
import type { NotifyChatPref, NotifyLikesPref } from './notification';

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  profile_photo?: string | null;
  bio?: string | null;

  // Social identity (opt-in, added in migration 028)
  hometown_district?: string | null;
  college?: string | null;
  years_in_us?: number | null;
  languages?: string[];
  follower_count?: number;
  following_count?: number;

  // Location
  metro_area_id?: string;
  zip_code?: string;

  // Trust & Safety
  trust_level: number; // 0 = New, 1 = Verified, 2 = Contributor
  email_verified: boolean;
  phone_verified: boolean;
  facebook_verified?: boolean;
  google_verified?: boolean;

  // Engagement
  posts_count: number;
  helpful_votes_received: number;
  reports_received: number;

  // Premium
  is_premium: boolean;

  // Moderation
  is_banned: boolean;
  ban_reason?: string;
  is_moderator: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_active_at: string;
}

/**
 * Another member's profile as readable through the REST API.
 *
 * Migration 036 grants anon/authenticated column-level SELECT on public.users,
 * so reads of other users never include email, phone, zip_code, ban_reason,
 * reports_received or the *_verified flags. The caller's own full `User` row
 * comes from `getMyProfile()` (the get_my_profile RPC) instead.
 */
export type PublicUser = Omit<
  User,
  | 'email'
  | 'phone'
  | 'zip_code'
  | 'ban_reason'
  | 'reports_received'
  | 'email_verified'
  | 'phone_verified'
  | 'facebook_verified'
  | 'google_verified'
>;

/** Lightweight user for API results (e.g., post author) */
export interface UserSummary {
  id: string;
  full_name: string;
  trust_level: number;
  profile_photo: string | null;
}

/** User settings — matches the user_settings table in DB */
export interface UserSettings {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  emergency_alerts: boolean;
  metro_area_alerts: boolean;
  notify_chat: NotifyChatPref;
  notify_comments: boolean;
  notify_likes: NotifyLikesPref;
  created_at?: string;
  updated_at?: string;
}

/** The preferences a member edits; what upsertUserSettings writes. */
export type UserSettingsValues = Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>;

/** Auth result types */
export interface EmailAuthResult {
  user?: { id: string; email: string };
  error?: Error;
}

export interface GoogleAuthResult {
  user?: { id: string; email: string; full_name: string; avatar_url?: string };
  error?: Error;
}

