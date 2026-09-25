# ADR: New Database Functions Are Executable by Nobody Until a Migration Grants It

**Date:** 2026-09-25
**Status:** Accepted
**Category:** Database / Security

## Context

Postgres grants EXECUTE on every new function to `PUBLIC`. Supabase adds default privileges that also grant it to `anon` and `authenticated` for every function in `public`. PostgREST exposes each of those functions at `/rest/v1/rpc/<name>`, so anyone with the anon key could call any function we wrote.

That matters most for `SECURITY DEFINER` functions, which run as their owner and skip RLS. By September 2026 there were 34 of them, and only three had their grants narrowed on purpose. The rest were callable by anon. That let anyone inflate listing view and contact counts, and call internal helpers that no client uses. Migration 017 had tried to close the counters with `REVOKE ... FROM PUBLIC`, but Supabase's explicit `anon` grant kept them open. Revoking one function at a time also does nothing for the next function someone adds.

## Decision

Migration `041_restrict_function_execute.sql`:

1. Narrows every existing `SECURITY DEFINER` function in `public` to the roles that need it.
   - Helpers that RLS policies call keep `anon` and `authenticated`, because a policy function runs as the querying role.
   - RPCs the apps call signed in keep `authenticated` only.
   - Internal helpers and trigger functions keep no client role.
   - `service_role` keeps everything.
2. Changes the default privileges so new functions start closed:

   ```sql
   ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;
   ```

   It takes two statements because Postgres only honours revoking `PUBLIC` at the global level. A per-schema default can add grants but cannot remove the built-in one.

From now on, every migration that creates a function grants EXECUTE explicitly to the roles that call it. The checklist is in [migration-workflow.md](../architecture/migration-workflow.md#adding-a-migration-going-forward).

## Consequences

- **Fails closed.** A forgotten grant shows up as `permission denied for function` (`42501`) the first time the app or a smoke test calls the function. It never exposes the function silently.
- **More typing.** Each new RPC or policy helper needs a `GRANT` line. Invoker functions such as `search_*` need one too, not only `SECURITY DEFINER` ones.
- **Global scope for `PUBLIC`.** The `PUBLIC` default changes for every function `postgres` creates in any schema, including functions from an extension that `postgres` installs. On Supabase, extensions are installed by `supabase_admin`, whose defaults are unchanged. If an extension installed as `postgres` ever breaks with a permission error, grant EXECUTE on the functions it needs.
- **Checked by** `npm run test:security:functions` ([setup-and-testing.md](../guides/setup-and-testing.md#security-smoke-tests)), which runs against staging after every migration that adds a function or changes its grants.

## Alternatives considered

- **Revoke per function and keep the defaults.** This fixes today's functions, but the next migration reopens the hole, and nothing flags it except the Supabase advisor.
- **Move functions to a schema PostgREST doesn't expose.** This hides them from `/rpc`, but policy helpers and triggers would still need grants, and every RPC the apps call would need a wrapper in `public`. That's more change for the same result.
