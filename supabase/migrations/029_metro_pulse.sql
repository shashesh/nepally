-- 029_metro_pulse.sql
-- ADDITIVE: adds cultural_events (seed table for Nepali festivals) and
-- fx_rates (cache for currency rates, lazy-refreshed by the shared API).
-- See docs/specs/2026-04-20-your-community-today-design.md §3.
--
-- Rollback (forward-only migration if ever needed):
--   DROP TABLE IF EXISTS fx_rates;
--   DROP TABLE IF EXISTS cultural_events;

-- 1) cultural_events: seeded festival calendar surfaced in the Pulse strip.
CREATE TABLE IF NOT EXISTS cultural_events (
  id text PRIMARY KEY,                 -- slug, e.g. 'dashain-2026'
  title text NOT NULL,
  starts_on date NOT NULL,             -- primary display date
  ends_on date,                        -- NULL for single-day events
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cultural_events_starts_on
  ON cultural_events (starts_on);

COMMENT ON TABLE cultural_events IS
  'Nepali cultural calendar surfaced by Metro Pulse. Seeded; admin-only writes.';

ALTER TABLE cultural_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cultural_events_select_all"
  ON cultural_events
  FOR SELECT
  USING (true);

CREATE POLICY "cultural_events_insert_mod_only"
  ON cultural_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid()) AND is_moderator = true
    )
  );

CREATE POLICY "cultural_events_update_mod_only"
  ON cultural_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid()) AND is_moderator = true
    )
  );

CREATE POLICY "cultural_events_delete_mod_only"
  ON cultural_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid()) AND is_moderator = true
    )
  );

-- Seed data: major Nepali festivals over the next 12 months.
-- Dates are approximations — moderators can refine via future migrations.
INSERT INTO cultural_events (id, title, starts_on, ends_on, description) VALUES
  ('buddha-jayanti-2026',   'Buddha Jayanti',        '2026-05-02', NULL,         'Celebration of Lord Buddha''s birth.'),
  ('saun-sankranti-2026',   'Saun Sankranti',        '2026-07-17', NULL,         'First day of the month of Saun.'),
  ('teej-2026',             'Teej',                  '2026-08-26', NULL,         'Festival celebrated primarily by Hindu women.'),
  ('indra-jatra-2026',      'Indra Jatra',           '2026-09-06', '2026-09-14', 'Kathmandu''s week-long street festival.'),
  ('dashain-2026',          'Dashain',               '2026-09-19', '2026-10-02', 'Nepal''s largest festival; 15 days culminating on Kojagrat Purnima.'),
  ('tihar-2026',            'Tihar',                 '2026-11-07', '2026-11-11', 'Five-day festival of lights.'),
  ('christmas-2026',        'Christmas',             '2026-12-25', NULL,         'Observed widely across US-based communities.'),
  ('maghe-sankranti-2027',  'Maghe Sankranti',       '2027-01-14', NULL,         'Marks the end of the winter solstice month Poush.'),
  ('saraswati-puja-2027',   'Saraswati Puja',        '2027-02-11', NULL,         'Festival of learning and the arts.'),
  ('maha-shivaratri-2027',  'Maha Shivaratri',       '2027-02-15', NULL,         'Night of Lord Shiva.'),
  ('holi-2027',             'Holi',                  '2027-03-13', NULL,         'Festival of colors.'),
  ('nepali-new-year-2084',  'Nepali New Year 2084',  '2027-04-14', NULL,         'Baisakh 1, 2084 BS.')
ON CONFLICT (id) DO NOTHING;

-- 2) fx_rates: cache of exchange rates, lazy-refreshed by shared API.
CREATE TABLE IF NOT EXISTS fx_rates (
  pair text PRIMARY KEY,                -- e.g. 'USD_NPR'
  rate numeric(12, 4) NOT NULL,
  source text NOT NULL,                 -- e.g. 'open.er-api.com'
  fetched_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE fx_rates IS
  'Cached FX rates. Writers are authenticated users via shared API (lazy refresh).';

ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fx_rates_select_all"
  ON fx_rates
  FOR SELECT
  USING (true);

CREATE POLICY "fx_rates_insert_any_authed"
  ON fx_rates
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "fx_rates_update_any_authed"
  ON fx_rates
  FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);
