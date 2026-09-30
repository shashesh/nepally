/**
 * purge-deleted-accounts — Supabase Edge Function
 *
 * Deletes accounts whose deletion grace period has ended, an hour after
 * their date (spec: docs/specs/2026-09-28-account-deletion.md). For each due
 * user it removes every storage object they own, then deletes the auth user;
 * ON DELETE CASCADE removes their rows. The pg_cron job from migration 049
 * calls it, hourly since migration 050.
 *
 * Auth: verify_jwt = false in config.toml. The caller must send an
 * x-purge-secret header equal to the ACCOUNT_PURGE_SECRET function secret.
 * Setup: docs/architecture/supabase-setup.md, "Scheduled Jobs".
 *
 * Response: 200 { purged, skipped, failed }. Logs user ids and error
 * messages only, never names or emails.
 */

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  purgeCutoff,
  purgeDueAccounts,
  secretsMatch,
  type PurgeDeps,
  type StorageObjectRef,
} from './purge.ts';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildDeps(supabase: SupabaseClient): PurgeDeps {
  return {
    async listDueUserIds(limit) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .lte('deletion_scheduled_for', purgeCutoff(new Date()))
        .order('deletion_scheduled_for', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []).map((row: { id: string }) => row.id);
    },
    async isStillDue(userId) {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .lte('deletion_scheduled_for', purgeCutoff(new Date()))
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
    async listStorageObjects(userId) {
      const { data, error } = await supabase.rpc('list_user_storage_objects', {
        p_user_id: userId,
      });
      if (error) throw error;
      return (data ?? []) as StorageObjectRef[];
    },
    async removeObjects(bucketId, paths) {
      const { error } = await supabase.storage.from(bucketId).remove(paths);
      if (error) throw error;
    },
    async deleteAuthUser(userId) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    logFailure(userId, error) {
      console.error(`purge-deleted-accounts: user ${userId} failed: ${errorMessage(error)}`);
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const expectedSecret = Deno.env.get('ACCOUNT_PURGE_SECRET') ?? '';
  if (expectedSecret.length === 0) {
    console.error('purge-deleted-accounts: ACCOUNT_PURGE_SECRET is not set');
    return new Response('Server misconfigured', { status: 500 });
  }
  if (!secretsMatch(req.headers.get('x-purge-secret') ?? '', expectedSecret)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const summary = await purgeDueAccounts(buildDeps(supabase));
    console.log(`purge-deleted-accounts: ${JSON.stringify(summary)}`);
    return Response.json(summary);
  } catch (error) {
    console.error(`purge-deleted-accounts: run failed: ${errorMessage(error)}`);
    return new Response('Purge failed', { status: 500 });
  }
});
