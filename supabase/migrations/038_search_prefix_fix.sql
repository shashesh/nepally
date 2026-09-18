-- 038_search_prefix_fix.sql
-- Fixes for the search layer added in 037 (review of PR #65).
--
-- 1. PREFIX MATCHING WAS BROKEN MID-WORD. 037 indexed posts and listings with
--    the `english` config and built the tsquery with it too, so both sides were
--    stemmed. Appending `:*` to a stemmed term cannot match a shorter stem:
--
--      document "Housing available in Queens" -> 'avail':2 'hous':1 'queen':4
--        "hous"    -> 'hous':*   -> match
--        "housi"   -> 'housi':*  -> NO MATCH
--        "housin"  -> 'housin':* -> NO MATCH
--        "housing" -> 'hous':*   -> match
--
--    With a 250ms debounce the suggestion dropdown went empty for two
--    keystrokes on every -ing/-ed/-ment word. Documents now carry BOTH the
--    stemmed (`english`) and raw lowercased (`simple`) lexemes, and the query
--    ORs a stemmed tsquery with a raw prefix tsquery. Prefixes match the raw
--    lexemes at every keystroke while full words still match by stem, so
--    "houses" continues to find "Housing".
--
-- 2. POSTS RE-DERIVED THEIR TSVECTOR PER MATCHING ROW. `count(*) OVER ()`
--    materializes the whole match set and `ts_rank` sits in the target list, so
--    to_tsvector ran once per match. posts.search_document is now a STORED
--    generated column. 037 avoided this on the grounds that a stored column
--    would appear in `select('*')`, but every posts read goes through the
--    explicit POST_SELECT, so no payload changes.
--
--    marketplace_listings keeps the expression document instead: LISTING_SELECT
--    is `*`, so a stored column there would enter every listing payload (as the
--    pre-existing search_vector already does). Listings are the smallest of the
--    three tables.
--
-- 3. build_prefix_tsquery was declared IMMUTABLE but calls array_to_string,
--    which pg_proc reports as STABLE. Postgres does not verify function bodies,
--    so this was accepted silently while making the function look
--    index-eligible. Now declared STABLE; nothing indexes it.
--
-- 4. idx_users_person_search_document is now partial on is_banned = false, so
--    banned members are not indexed and search_people stops fetching rows it
--    always discards. People search stays nationwide with local-first ordering,
--    which is the documented behaviour (docs/product/features/search.md).
--
-- marketplace_listings.search_vector is left untouched: the marketplace filter
-- still uses it through textSearch(). Additive — no DROP TABLE / DROP TYPE.

-- ─── 1. Posts: stored dual-config document ─────────────────────────────────
-- The 037 GIN index stores values precomputed from the old function body, so it
-- is dropped and replaced by an index on the stored column. The expression is
-- inlined rather than calling post_search_document(), so a later change to that
-- function can never leave the column silently stale.

DROP INDEX IF EXISTS public.idx_posts_search_document;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS search_document tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A')
    || setweight(to_tsvector('simple'::regconfig, coalesce(title, '')), 'A')
    || setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'B')
    || setweight(to_tsvector('simple'::regconfig, coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_posts_search_document
  ON public.posts USING GIN (search_document);

-- Kept in sync with the column above for any caller that still uses it.
CREATE OR REPLACE FUNCTION public.post_search_document(p_title text, p_description text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_title, '')), 'A')
      || pg_catalog.setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(p_title, '')), 'A')
      || pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_description, '')), 'B')
      || pg_catalog.setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(p_description, '')), 'B');
$$;

-- ─── 2. Listings: dual-config expression document ──────────────────────────

CREATE OR REPLACE FUNCTION public.listing_search_document(p_title text, p_description text)
RETURNS tsvector
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_title, '')), 'A')
      || pg_catalog.setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(p_title, '')), 'A')
      || pg_catalog.setweight(pg_catalog.to_tsvector('english'::regconfig, coalesce(p_description, '')), 'B')
      || pg_catalog.setweight(pg_catalog.to_tsvector('simple'::regconfig, coalesce(p_description, '')), 'B');
$$;

CREATE INDEX IF NOT EXISTS idx_listings_search_document
  ON public.marketplace_listings USING GIN (public.listing_search_document(title, description));

-- ─── 3. People: index only the rows search can return ──────────────────────

DROP INDEX IF EXISTS public.idx_users_person_search_document;

CREATE INDEX IF NOT EXISTS idx_users_person_search_document
  ON public.users USING GIN (public.person_search_document(full_name))
  WHERE is_banned = false;

-- ─── 4. Honest volatility, and the combined query builder ──────────────────

CREATE OR REPLACE FUNCTION public.build_prefix_tsquery(p_input text, p_config regconfig)
RETURNS tsquery
LANGUAGE sql
STABLE
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
  ) AS split;
$$;

-- Stemmed OR raw-prefix. Both operands come from the same input, so they are
-- NULL together; a stopword-only input yields an empty `english` tsquery and
-- the `simple` side still carries the prefix.
CREATE OR REPLACE FUNCTION public.build_search_tsquery(p_input text)
RETURNS tsquery
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT public.build_prefix_tsquery(p_input, 'english'::regconfig)
      || public.build_prefix_tsquery(p_input, 'simple'::regconfig);
$$;

-- ─── 5. Search functions ───────────────────────────────────────────────────

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
  WITH q AS (SELECT public.build_search_tsquery(p_query) AS query)
  SELECT p.id,
         pg_catalog.ts_rank(p.search_document, q.query) AS rank,
         p.created_at,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.posts AS p
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND p.status = 'active'
    AND p.search_document @@ q.query
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
  WITH q AS (SELECT public.build_search_tsquery(p_query) AS query)
  SELECT l.id,
         pg_catalog.ts_rank(public.listing_search_document(l.title, l.description), q.query) AS rank,
         l.refreshed_at,
         pg_catalog.count(*) OVER () AS total_count
  FROM public.marketplace_listings AS l
  CROSS JOIN q
  WHERE q.query IS NOT NULL
    AND l.status = 'active'
    AND public.listing_search_document(l.title, l.description) @@ q.query
    AND (p_all_metros OR l.metro_area_id = p_metro_id OR l.is_global);
$$;

-- search_people is unchanged in shape: it already used `simple`, so its
-- prefixes never broke, and it stays nationwide by design.

-- CREATE OR REPLACE preserves privileges, but restate them so this file is
-- self-contained if replayed onto a database that never ran 037.
REVOKE ALL ON FUNCTION public.search_posts(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_posts(text, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.search_listings(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_listings(text, text, boolean) TO authenticated;

COMMENT ON COLUMN public.posts.search_document IS
  'Dual-config search document: english stems plus simple raw lexemes, weighted A (title) and B (description). Excluded from POST_SELECT.';
COMMENT ON FUNCTION public.build_search_tsquery(text) IS
  'Stemmed (english) OR raw-prefix (simple) tsquery, so partially typed words match at every keystroke.';
COMMENT ON FUNCTION public.listing_search_document(text, text) IS
  'Dual-config listing document: english stems plus simple raw lexemes, weighted A (title) and B (description).';
