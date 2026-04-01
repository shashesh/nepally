-- 016_consolidate_marketplace_categories.sql
-- Consolidate 12 marketplace categories → 5
-- Additive/non-destructive: no DROP TABLE, no DROP TYPE
-- All 5 surviving slugs already exist; we remap listings then delete the 7 merged categories.

-- ─── Mapping legend ──────────────────────────────────────────────────────────
-- grocery-specialty        → food-restaurants
-- health-wellness          → professional-services
-- education-tutoring       → professional-services
-- home-services            → professional-services
-- transportation           → professional-services
-- beauty-wellness          → professional-services
-- cultural-services        → professional-services

-- ─── Step 1: Remap listings that belong to merged-away categories ─────────────

UPDATE marketplace_listings
SET category_id = (SELECT id FROM marketplace_categories WHERE slug = 'food-restaurants')
WHERE category_id = (SELECT id FROM marketplace_categories WHERE slug = 'grocery-specialty');

UPDATE marketplace_listings
SET category_id = (SELECT id FROM marketplace_categories WHERE slug = 'professional-services')
WHERE category_id IN (
  SELECT id FROM marketplace_categories
  WHERE slug IN (
    'health-wellness',
    'education-tutoring',
    'home-services',
    'transportation',
    'beauty-wellness',
    'cultural-services'
  )
);

-- ─── Step 2: Delete the 7 categories that have been merged away ───────────────

DELETE FROM marketplace_categories
WHERE slug IN (
  'grocery-specialty',
  'health-wellness',
  'education-tutoring',
  'home-services',
  'transportation',
  'beauty-wellness',
  'cultural-services'
);

-- ─── Step 3: Update the 5 surviving categories ───────────────────────────────
-- Refresh descriptions to reflect their broader scope and fix sort order.

UPDATE marketplace_categories
SET
  description = 'Nepali restaurants, cafes, catering, tiffin services, grocery stores, and specialty ingredients',
  sort_order   = 1
WHERE slug = 'food-restaurants';

UPDATE marketplace_categories
SET
  description = 'Immigration attorneys, visa help, legal consultations, and document services',
  sort_order   = 2
WHERE slug = 'immigration-legal';

UPDATE marketplace_categories
SET
  description = 'Consulting, IT, accounting, health, education, tutoring, home services, transportation, beauty, cultural, and all other professional services',
  sort_order   = 3
WHERE slug = 'professional-services';

UPDATE marketplace_categories
SET
  description = 'Money transfer, tax filing, financial planning, and remittance services',
  sort_order   = 4
WHERE slug = 'remittance-finance';

UPDATE marketplace_categories
SET
  description = 'Everything else not covered by other categories',
  sort_order   = 5
WHERE slug = 'other';
