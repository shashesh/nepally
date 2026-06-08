# PostgreSQL Version Sync (local 15 → 17) — Operations Note

**Plan Version:** v2 (rewritten after live-DB check)
**Date:** 2026-06-07
**Owner:** Shashesh Silwal
**Status:** In Progress
**Type:** Infrastructure / database (not a feature)
**Related:** [TECH-VERSIONS.md](../../../TECH-VERSIONS.md), [supabase/config.toml](../../../supabase/config.toml), [docs/architecture/supabase-setup.md](../../architecture/supabase-setup.md)

---

## TL;DR — There is no engine upgrade to do

The investigation that prompted this plan asked whether the database needs a Postgres upgrade. A live check of the Supabase project on **2026-06-07** found the remote is **already on PostgreSQL 17.6.1 (GA, `ACTIVE_HEALTHY`)**. The only thing that was out of date was the **local config** (`config.toml` pinned `major_version = 15`) and the version docs. This note records the finding and the one-time sync.

---

## 1) Live DB findings (2026-06-07, via Supabase MCP)

- **Project:** `nusa-staging` (`tlusiongalvszftnzpoq`), region `us-west-2`, status `ACTIVE_HEALTHY`. **This is the only project** in the org — there is no separate production project.
- **Engine:** PostgreSQL **17.6.1.063**, `postgres_engine: 17`, `release_channel: ga`.
- **Extensions installed & healthy on 17:** `pg_cron` 1.6.4, `pg_net` 0.19.5, `uuid-ossp` 1.1, `pgcrypto` 1.3, `pg_graphql` 1.5.11, `supabase_vault` 0.3.1, `pg_stat_statements` 1.11, `plpgsql`.
- **`pg_cron` jobs:** `SELECT count(*) FROM cron.job` = **0** (no dashboard-created schedules to preserve).
- **Local drift (the actual issue):** `supabase/config.toml` had `major_version = 15` while the file's own comment requires it to match the remote (17). Local `supabase start` was therefore running PG15 while prod ran PG17.

---

## 2) Action taken (this branch: `chore/postgres-15-to-17-upgrade-plan`)

- `supabase/config.toml`: `major_version` 15 → **17** (+ comment noting remote is 17 GA).
- `TECH-VERSIONS.md`: PostgreSQL row 15+ → **17.6.x** with a dated sync note.
- `docs/INDEX.md`: entry for this note.

**Local dev follow-up (manual, by developer):** after pulling this change, re-create the local stack so it uses the PG17 image:
```bash
supabase stop
supabase start   # pulls postgres:17 image; local DB is recreated from migrations/seed
```
Local data is ephemeral (seeded), so recreation is expected and safe.

---

## 3) Verification (post-sync)

- [x] Remote `SELECT version();` → 17.6.x (confirmed via MCP)
- [x] Extensions present & healthy on 17 (confirmed via `pg_extension` + `list_extensions`)
- [x] No orphaned `pg_cron` jobs needing migration
- [ ] `supabase start` succeeds locally on PG17 (developer to confirm on next local run)
- [ ] Optional: re-run `get_advisors` (security + performance) to capture any post-17 recommendations

---

## 4) Why no upgrade work is needed

- Engine is already on the current Supabase default major (17); PG 15 EOL (Nov 2027) is irrelevant now.
- All in-use extensions and generated-column / full-text features are supported and running on 17.
- No cutover, maintenance window, or rollback plan required — nothing is being changed on the remote.

---

## 5) Notes / follow-ups (not blocking)

- **Project name vs app name:** the only Supabase project is still named `nusa-staging` (pre-Nepally rename) and is labeled "staging". Confirm whether this *is* the production database the app points to, or whether a dedicated prod project is intended later. (Informational — not part of this sync.)
- If a separate production project is created in future, ensure it is provisioned on PG 17 and `config.toml` stays matched.
