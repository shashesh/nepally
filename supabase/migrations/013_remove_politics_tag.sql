-- =====================================================
-- 013: Remove the "Politics" tag
-- =====================================================
-- The Politics tag is being removed from the platform.
-- This migration deletes any post_tags referencing it,
-- then removes the tag itself, and reorders remaining tags.

-- 1. Delete post_tags rows referencing the politics tag
DELETE FROM post_tags
WHERE tag_id IN (SELECT id FROM tags WHERE slug = 'politics');

-- 2. Delete the politics tag itself
DELETE FROM tags WHERE slug = 'politics';

-- 3. Reorder remaining tags: Housing(1), Jobs(2), Help(3), Question(4), Discussion(5), Emergency(6)
UPDATE tags SET sort_order = 1 WHERE slug = 'housing';
UPDATE tags SET sort_order = 2 WHERE slug = 'jobs';
UPDATE tags SET sort_order = 3 WHERE slug = 'help';
UPDATE tags SET sort_order = 4 WHERE slug = 'question';
UPDATE tags SET sort_order = 5 WHERE slug = 'discussion';
UPDATE tags SET sort_order = 6 WHERE slug = 'emergency';
