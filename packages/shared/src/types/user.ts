/**
 * User data types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_schema.sql
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  profile_photo?: string;

  // Location
  metro_area_id?: string;
  zip_code?: string;

  // Trust & Safety
  trust_level: number; // 0 = New, 1 = Verified, 2 = Contributor
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

/** Lightweight user for API results (e.g., post author) */
export interface UserSummary {
  id: string;
  full_name: string;
  trust_level: number;
  profile_photo: string | null;
}

/** User settings */
export interface UserSettings {
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  emergency_alerts: boolean;
  metro_area_alerts: boolean;
}

/** Auth result types */
export interface EmailAuthResult {
  user?: { id: string; email: string };
  error?: Error;
}

export interface GoogleAuthResult {
  user?: { id: string; email: string; full_name: string; avatar_url?: string };
  error?: Error;
}

export interface PhoneAuthResult {
  success: boolean;
  error?: Error;
}
