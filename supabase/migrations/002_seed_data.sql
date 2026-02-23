-- NUSA Seed Data
-- Initial data required for the application to function.

-- =====================================================
-- 1. System Tags (7 default tags)
-- =====================================================

INSERT INTO tags (name, slug, icon, color, description, is_system, requires_moderation, sort_order) VALUES
  ('Housing',    'housing',    'home',      '#4CAF50', 'Rent, roommates, apartments, housing questions',     true, false, 1),
  ('Jobs',       'jobs',       'briefcase', '#2196F3', 'Job postings, hiring, career questions',             true, false, 2),
  ('Help',       'help',       'hand',      '#FF9800', 'Requests for help, assistance, favors',              true, false, 3),
  ('Question',   'question',   'question',  '#9C27B0', 'General questions about life in the US',             true, false, 4),
  ('Politics',   'politics',   'building',  '#607D8B', 'Community politics, policy discussions',             true, false, 5),
  ('Discussion', 'discussion', 'chat',      '#00BCD4', 'Open discussions, opinions, community topics',       true, false, 6),
  ('Emergency',  'emergency',  'warning',   '#F44336', 'Emergencies requiring community coordination',       true, true,  7);

-- =====================================================
-- 2. Migrate existing users' home location
-- =====================================================
-- For users who already have a metro_area_id set on their profile,
-- create a "Home" entry in user_saved_locations so they appear in
-- the new location management system.

INSERT INTO user_saved_locations (user_id, metro_area_id, label, zip_code, is_default, sort_order)
SELECT
  id AS user_id,
  metro_area_id,
  'Home' AS label,
  zip_code,
  true AS is_default,
  0 AS sort_order
FROM users
WHERE metro_area_id IS NOT NULL;
