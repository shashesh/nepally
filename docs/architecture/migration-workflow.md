# Database Migration Workflow & Tracker

**Last updated:** 2026-09-04
**Applies to:** Supabase project `nusa-staging` (`tlusiongalvszftnzpoq`) — the single live database.

This doc defines how database migrations are authored and applied for Nepally, and records the 2026-06-07 reconciliation of the remote migration tracker. Read alongside [database-schema.md](database-schema.md) (schema + numbering rules) and [supabase-setup.md](supabase-setup.md).

> **Dates vs. timestamps:** prose dates in this doc (e.g. "2026-06-07") are the local working date. The `version` timestamps in the tracker tables below are **UTC**, auto-assigned by Supabase. They can therefore read one calendar day ahead — e.g. the migration-033 row `20260608021301` is `2026-06-08 02:13:01 UTC`, which is the evening of 2026-06-07 in US local time (the same session).

---

## How migrations work here (canonical workflow)

- **Source of truth = the repo.** Every schema change is a numerically-prefixed file in `supabase/migrations/` (`001_…` … `NNN_…`). Sequential numeric prefixes only — never timestamps. See the numbering rules in [database-schema.md](database-schema.md) and `CLAUDE.md`.
- **Migrations are applied manually / out-of-band**, not via `supabase db push`:
  - Preferred: the Supabase MCP `apply_migration` tool (records the migration in the remote tracker automatically), **or**
  - The Supabase Dashboard SQL Editor.
- **`001_schema.sql`, `002_seed_data.sql`, `003_storage.sql` are FROZEN** — they contain destructive `DROP TABLE … CASCADE` teardown. Never modify or re-run them on a live database.
- Each schema change is a **new** incremental file (`034_…`, `035_…`), additive only (`ALTER`/`CREATE`/`CREATE POLICY`), never `DROP TABLE`/`DROP TYPE`.

### ⚠️ Do NOT run `supabase db push` against this project (without first reading "Adopting the CLI" below)

The repo is **not linked** (`supabase/config.toml` `project_id` is the placeholder `"your-project-id"`). The repo uses numeric version prefixes while the Supabase CLI defaults to 14-digit timestamps. A naive `db push` against a freshly-linked project could try to replay `001` (destructive). Apply via MCP/dashboard instead.

---

## 2026-06-07 — Migration tracker realignment

### What was wrong (drift)

The remote `supabase_migrations.schema_migrations` table had drifted from the repo:

- It mixed **timestamp versions** (`20260303155854`) with inconsistent names — some matched repo files (`001_schema`, `014_marketplace`), some were renamed (`add_saved_posts` = repo `005`, `user_bio` = repo `025`), and some were early ad-hoc dashboard fixes with **no standalone repo file** (`drop_conversations_post_id`, `enable_rls_on_chat_tables`, `fix_conversation_participants_rls_recursion`, etc. — folded into repo `004`/`008`).
- `email_verification` was recorded twice.
- Repo files **entirely missing** from the tracker: `002, 003, 012, 013, 026, 028, 029, 030, 031, 032`.
- Consequence: migration `032`'s `ALTER VIEW user_helper_scores SET (security_invoker = true)` had never actually taken effect on the remote, leaving the view SECURITY DEFINER until `033` fixed it.

### What was done

The tracker was **rewritten to mirror the repo exactly** (decision: repo numeric scheme stays the source of truth, matching the manual/MCP workflow). All rows were replaced in a single transaction with 33 rows: `version` = numeric prefix (`001`…`033`), `name` = file stem, `statements` = a pointer comment to the canonical repo file.

This changed **only the bookkeeping table** — no schema, data, RLS, or application behavior was touched.

### Before-snapshot (for reversibility)

The pre-realignment tracker contents (31 rows), captured before the rewrite:

| version (timestamp) | name |
|---|---|
| 20260223124703 | drop_conversations_post_id |
| 20260223163609 | post_photos_storage |
| 20260224002839 | enable_rls_on_chat_tables |
| 20260224003545 | fix_function_search_paths |
| 20260224003810 | fix_multiple_permissive_policies |
| 20260224004250 | fix_rls_auth_initplan_performance |
| 20260224114717 | fix_conversation_participants_rls_recursion |
| 20260303155854 | 001_schema |
| 20260303170149 | conversations_add_creator_id |
| 20260303191153 | fix_like_notification_username |
| 20260303202736 | add_saved_posts |
| 20260304000000 | 006_events |
| 20260311021840 | email_verification |
| 20260312152211 | email_verification |
| 20260324021032 | notification_push_fanout |
| 20260324021116 | notification_push_url_fallback |
| 20260324160411 | notifications_delete_policy |
| 20260330010356 | 014_marketplace |
| 20260330011907 | 015_listing_photos_storage |
| 20260401012532 | 016_consolidate_marketplace_categories |
| 20260406152015 | marketplace_featured_and_trending |
| 20260409204319 | 017_fix_marketplace_rpc_security_and_search |
| 20260409204338 | 019_event_interested |
| 20260409204348 | 020_promotions |
| 20260411015235 | 021_fix_cascade_premium_promotion |
| 20260413194205 | 023_drop_is_featured |
| 20260413195036 | 022_lock_down_promotion_inserts |
| 20260414013057 | 024_fix_promotions_rls_and_feed |
| 20260416014726 | user_bio |
| 20260416023723 | security_warnings_hardening |
| 20260608021301 | fix_security_definer_view_and_rls_initplan |

### After (current)

37 rows, `version` `001`–`037`, `name` = repo file stem — an exact mirror of `supabase/migrations/*.sql`. The exception is the `036` row: its `name` is `036_restrict_user_pii_and_chat_participation`, keeping the repo's numeric prefix, unlike every other row.

`034_guard_user_privileged_columns` and `035_emergency_post_moderation` were applied 2026-09-04 via MCP `apply_migration`. That tool records a **timestamp** version (e.g. `20260904162458`), so each row was realigned to its numeric version right after applying (see step 3 below). The reports SELECT-policy change in 035 was added to the file after the initial apply and applied as a delta with `execute_sql`; the tracker row already existed, so no new row was needed.

`036_restrict_user_pii_and_chat_participation` kept its apply-time timestamp version (`20260908211511`) until it was realigned to `036` on 2026-09-15. `037_search` was applied on 2026-09-15 via MCP `apply_migration` (name `search`) and realigned to `037` straight away.

---

## Adding a migration going forward

1. Create `supabase/migrations/NNN_short_description.sql` (next sequential number; additive only).
2. Apply via MCP `apply_migration` (name = the file stem without the numeric prefix) **or** the dashboard SQL Editor.
3. Both paths record a 14-digit **timestamp** version (confirmed for `apply_migration` on 2026-09-04). Realign the new row so the tracker keeps mirroring the repo:

   ```sql
   UPDATE supabase_migrations.schema_migrations
      SET version = 'NNN',
          statements = ARRAY['-- Canonical SQL: supabase/migrations/NNN_<name>.sql']
    WHERE version = '<timestamp>' AND name = '<name>';
   ```

4. Re-run advisors (`get_advisors`) after DDL to catch new RLS/security/perf issues.
5. **New indexes on tables that already hold data** (production once it has users): use `CREATE INDEX CONCURRENTLY`, because a plain `CREATE INDEX` blocks writes to the table until the build finishes. `CONCURRENTLY` cannot run inside a transaction block. That means an explicit `BEGIN`/`COMMIT` added by the runner, and also the implicit block Postgres opens when several statements arrive in a single query string (Postgres docs, "Multiple Statements in a Simple Query"). So give each such index a migration of its own, containing only that statement. Nobody has yet checked whether `apply_migration` wraps its SQL in a transaction; check that before the first one. A fresh database that replays `001`–`NNN` has empty tables, so a plain `CREATE INDEX` is fine there. That is why `037`/`038` need no change for the production project.

## Adopting the Supabase CLI later (optional, not done)

If the team wants `supabase db push/pull`:

1. Rename all repo migrations to 14-digit timestamp prefixes (note: touches the FROZEN `001`–`003` filenames — content unchanged).
2. Set the real `project_id` in `config.toml` and `supabase link`.
3. `supabase migration repair --status applied <version>` for every migration so none replay.
This is a dedicated effort; until then, stick to the manual/MCP workflow above.
