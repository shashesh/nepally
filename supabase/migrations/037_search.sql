-- 037_search.sql
-- Global search (web UI overhaul, docs/specs/2026-09-14-web-ui-overhaul-design.md §4.4).
--
-- 1. IMMUTABLE search-document functions for posts and people, with GIN
--    expression indexes. Expression indexes (not STORED columns) keep tsvectors
--    out of `select('*')` payloads and need no new column grants.
-- 2. build_prefix_tsquery(): turns raw user input into a safe prefix tsquery.
-- 3. search_posts / search_listings / search_people: SECURITY INVOKER, so RLS
--    and migration 036's column grants apply exactly as for direct queries.
--    They return ranked ids (+ public person columns) and a window total; the
--    client orders and pages the result through PostgREST.
--
-- Additive migration — no DROP TABLE / DROP TYPE.

-- ─── 1. Search documents + indexes ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.post_search_document(p_title text, p_description text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_title, '')), 'A')
      || pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_description, '')), 'B');
$$;

CREATE INDEX IF NOT EXISTS idx_posts_search_document
  ON public.posts USING GIN (public.post_search_document(title, description));

-- Names are not English words: the `simple` config lowercases without stemming.
CREATE OR REPLACE FUNCTION public.person_search_document(p_full_name text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT pg_catalog.to_tsvector('simple'::regconfig, coalesce(p_full_name, ''));
$$;

CREATE INDEX IF NOT EXISTS idx_users_person_search_document
  ON public.users USING GIN (public.person_search_document(full_name));

-- ─── 2. Safe prefix query builder ──────────────────────────────────────────
-- "thapa's NCLEX (pr" → 'thapa' & 's' & 'nclex' & 'pr':*
-- Whitespace, punctuation and every ASCII non-alphanumeric character separate
-- words, so tsquery operators in user input can never produce a syntax error.
-- Postgres [:alnum:] excludes combining marks (Devanagari vowel signs), so it
-- is not used: "राम थाप" must stay {राम, थाप}. Returns NULL for empty input.

CREATE OR REPLACE FUNCTION public.build_prefix_tsquery(p_input text, p_config regconfig)
RETURNS tsquery
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN pg_catalog.array_length(words, 1) IS NULL THEN NULL
    ELSE pg_catalog.to_tsquery(
      p_config,
      pg_catalog.array_to_string(words, ' & ') || ':*'
    )
  END
  FROM (
    SELECT pg_catalog.array_remove(
      pg_catalog.regexp_split_to_array(pg_catalog.lower(coalesce(p_input, '')), '[[:space:][:punct:]!-/:-@[-`{-~]+'),
      ''
    ) AS words
  ) AS tokens;
$$;

-- ─── 3. Search functions ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_posts(
  p_query text,
  p_metro_id text,
  p_all_metros boolean DEFAULT false
)
RETURNS TABLE (id uuid, rank real, created_at timestamptz, total_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (SELECT public.build_prefix_tsquery(p_query, 'english'::regconfig) AS query)
  SELECT p.id,
         pg_catalog.ts_rank(public.post_search_document(p.title, p.description), q.query) AS rank,
         p.created_at,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.posts AS p
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND p.status = 'active'
    AND public.post_search_document(p.title, p.description) @@ q.query
    AND (p_all_metros OR p.metro_area_id = p_metro_id OR p.is_global);
$$;

CREATE OR REPLACE FUNCTION public.search_listings(
  p_query text,
  p_metro_id text,
  p_all_metros boolean DEFAULT false
)
RETURNS TABLE (id uuid, rank real, refreshed_at timestamptz, total_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (SELECT public.build_prefix_tsquery(p_query, 'english'::regconfig) AS query)
  SELECT l.id,
         pg_catalog.ts_rank(l.search_vector, q.query) AS rank,
         l.refreshed_at,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.marketplace_listings AS l
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND l.status = 'active'
    AND l.search_vector @@ q.query
    AND (p_all_metros OR l.metro_area_id = p_metro_id OR l.is_global);
$$;

CREATE OR REPLACE FUNCTION public.search_people(p_query text, p_metro_id text)
RETURNS TABLE (
  id uuid,
  full_name text,
  profile_photo text,
  trust_level integer,
  metro_area_id text,
  follower_count integer,
  is_local boolean,
  rank real,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH q AS (SELECT public.build_prefix_tsquery(p_query, 'simple'::regconfig) AS query)
  SELECT u.id,
         u.full_name,
         u.profile_photo,
         u.trust_level,
         u.metro_area_id,
         u.follower_count,
         coalesce(u.metro_area_id = p_metro_id, false) AS is_local,
         pg_catalog.ts_rank(public.person_search_document(u.full_name), q.query) AS rank,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.users AS u
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND u.is_banned = false
    AND public.person_search_document(u.full_name) @@ q.query;
$$;

-- Signed-in members only. The helper functions keep default EXECUTE so index
-- maintenance and the invoker-rights search functions can always call them.
REVOKE ALL ON FUNCTION public.search_posts(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_posts(text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.search_listings(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_listings(text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.search_people(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people(text, text) TO authenticated;

COMMENT ON FUNCTION public.search_posts(text, text, boolean) IS
  'Ranked active post ids for a prefix query; metro + global unless p_all_metros. Order by rank desc, created_at desc.';
COMMENT ON FUNCTION public.search_listings(text, text, boolean) IS
  'Ranked active listing ids for a prefix query; metro + global unless p_all_metros. Order by rank desc, refreshed_at desc.';
COMMENT ON FUNCTION public.search_people(text, text) IS
  'Public columns of non-banned members matching a name prefix query. Order by is_local desc, rank desc, follower_count desc.';
