-- 025_user_bio.sql
-- ADDITIVE: add an optional, user-controlled short bio column to users.
-- Displayed on the public profile view; edited from the own-profile screen.
--
-- Constraints:
--   - nullable: bios are optional; new and existing users default to NULL
--   - CHAR_LENGTH <= 200: matches UI contract in shared/validation/user.ts
--   - no RLS change: bio is readable wherever the users row is readable
--     (existing policies already cover "self" + limited public read via
--     the users table SELECT policy)
--
-- Rollback notes
--   To roll back, write migration 026 that runs:
--     ALTER TABLE users DROP COLUMN bio;

ALTER TABLE users
  ADD COLUMN bio text;

ALTER TABLE users
  ADD CONSTRAINT users_bio_length_check
  CHECK (bio IS NULL OR CHAR_LENGTH(bio) <= 200);

COMMENT ON COLUMN users.bio IS
  'Optional short self-description shown on the public profile. Max 200 chars. Enforced in shared validation.';
