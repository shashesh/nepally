import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createReport,
  listReports,
  resolveReport,
  type CreateReportInput,
} from './reports';

const BASE_REPORT_INPUT: CreateReportInput = {
  reported_by: 'user-1',
  target_type: 'post',
  target_id: 'post-1',
  reason: 'Spam',
};

describe('createReport', () => {
  it('creates and returns a report', async () => {
    const row = {
      id: 'report-1',
      reported_by: 'user-1',
      target_type: 'post',
      target_id: 'post-1',
      reason: 'Spam',
      description: null,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      action: null,
      created_at: new Date().toISOString(),
    };

    const query = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await createReport(supabase, BASE_REPORT_INPUT);

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe('report-1');
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        reported_by: 'user-1',
        target_type: 'post',
        target_id: 'post-1',
      })
    );
  });

  it('normalizes empty description to null', async () => {
    const row = {
      id: 'report-2',
      reported_by: 'user-1',
      target_type: 'post',
      target_id: 'post-1',
      reason: 'Spam',
      description: null,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      action: null,
      created_at: new Date().toISOString(),
    };

    const query = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await createReport(supabase, { ...BASE_REPORT_INPUT, description: '   ' });

    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    );
  });

  it('returns an error on supabase failure', async () => {
    const query = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await createReport(supabase, BASE_REPORT_INPUT);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('listReports', () => {
  it('lists reports ordered by created_at desc', async () => {
    const rows = [{ id: 'report-1', status: 'pending' }];

    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: rows, error: null }),
      eq: vi.fn().mockReturnThis(),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await listReports(supabase);

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(1);
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.range).toHaveBeenCalledWith(0, 49);
  });

  it('applies status filter when provided', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await listReports(supabase, { status: 'pending', limit: 25, offset: 10 });

    expect(query.range).toHaveBeenCalledWith(10, 34);
    expect(query.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('returns an error on supabase failure', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: new Error('Query failed') }),
      eq: vi.fn().mockReturnThis(),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await listReports(supabase);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });
});

describe('resolveReport', () => {
  it('updates report status and reviewer fields', async () => {
    const row = {
      id: 'report-1',
      status: 'actioned',
      reviewed_by: 'moderator-1',
      action: 'removed',
    };

    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await resolveReport(supabase, 'report-1', {
      status: 'actioned',
      reviewed_by: 'moderator-1',
      action: 'removed',
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.status).toBe('actioned');
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'actioned',
        reviewed_by: 'moderator-1',
        action: 'removed',
        reviewed_at: expect.any(String),
      })
    );
  });

  it('maps PGRST116 to report not found', async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'JSON object requested, multiple (or no) rows returned',
        },
      }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await resolveReport(supabase, 'missing', {
      status: 'dismissed',
      reviewed_by: 'moderator-1',
    });

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toBe('Report not found');
  });

  it('returns error on update failure', async () => {
    const query = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: new Error('Update failed') }),
    };

    const supabase = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    const result = await resolveReport(supabase, 'report-1', {
      status: 'reviewed',
      reviewed_by: 'moderator-1',
    });

    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
  });
});
