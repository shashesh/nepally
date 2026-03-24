/**
 * Report and moderation types — snake_case matching Supabase database columns
 * See: supabase/migrations/001_schema.sql
 */
import type { UserSummary } from './user';

export type ReportTargetType = 'post' | 'user' | 'message';

export type ReportStatus = 'pending' | 'reviewed' | 'dismissed' | 'actioned';

export type ReportAction = 'removed' | 'warned' | 'banned' | 'none';

export interface Report {
  id: string;
  reported_by: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action: ReportAction | null;
  created_at: string;
}

export interface ReportWithUsers extends Report {
  reported_by_user?: UserSummary | null;
  reviewed_by_user?: UserSummary | null;
}

export interface ReportResult {
  data?: Report;
  error?: Error;
}

export interface ReportsResult {
  data?: ReportWithUsers[];
  error?: Error;
}
