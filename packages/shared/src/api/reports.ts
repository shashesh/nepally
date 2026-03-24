/**
 * Shared Reports API functions
 * All Supabase query logic — accepts SupabaseClient via dependency injection.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Report,
  ReportAction,
  ReportResult,
  ReportsResult,
  ReportStatus,
  ReportTargetType,
  ReportWithUsers,
} from '../types/report';

const MODERATOR_REPORT_SELECT = `
  *,
  reported_by_user:users!reports_reported_by_fkey (
    id,
    full_name,
    trust_level,
    profile_photo
  ),
  reviewed_by_user:users!reports_reviewed_by_fkey (
    id,
    full_name,
    trust_level,
    profile_photo
  )
`;

export interface CreateReportInput {
  reported_by: string;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  description?: string;
}

export interface ListReportsInput {
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}

export interface ResolveReportInput {
  status: Extract<ReportStatus, 'reviewed' | 'dismissed' | 'actioned'>;
  reviewed_by: string;
  action?: ReportAction;
}

/**
 * Create a report as a verified user.
 * RLS enforces trust level and self-reported_by identity.
 */
export async function createReport(
  supabase: SupabaseClient,
  input: CreateReportInput
): Promise<ReportResult> {
  try {
    const payload = {
      reported_by: input.reported_by,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      description: input.description?.trim() || null,
    };

    const { data, error } = await supabase
      .from('reports')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to create report');

    return { data: data as Report };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to create report'),
    };
  }
}

/**
 * List reports for moderator queue.
 * RLS enforces moderator-only visibility.
 */
export async function listReports(
  supabase: SupabaseClient,
  options: ListReportsInput = {}
): Promise<ReportsResult> {
  try {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    let query = supabase
      .from('reports')
      .select(MODERATOR_REPORT_SELECT)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: (data || []) as ReportWithUsers[] };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to list reports'),
    };
  }
}

/**
 * Resolve/update a report as a moderator.
 * RLS enforces moderator-only updates.
 */
export async function resolveReport(
  supabase: SupabaseClient,
  reportId: string,
  input: ResolveReportInput
): Promise<ReportResult> {
  try {
    const payload = {
      status: input.status,
      reviewed_by: input.reviewed_by,
      reviewed_at: new Date().toISOString(),
      action: input.action ?? null,
    };

    const { data, error } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', reportId)
      .select('*')
      .single();

    if ((error as { code?: string } | null)?.code === 'PGRST116') {
      return { error: new Error('Report not found') };
    }

    if (error) throw error;
    if (!data) return { error: new Error('Report not found') };

    return { data: data as Report };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error('Failed to resolve report'),
    };
  }
}
