-- 040_user_full_name_length.sql
-- ADDITIVE / non-destructive. Caps users.full_name at 100 characters in the
-- database, the limit shared validation already enforces.
--
--   Problem: 001 declares full_name only as NOT NULL. fullNameSchema
--   (packages/shared/src/validation/user.ts) has capped a name at
--   FULL_NAME_MAX_LENGTH = 100 on both apps' edit forms, but nothing stopped a
--   longer value reaching the table another way: createUserProfile inserted
--   the provider's name (Google's full_name, or the sign-up form's text)
--   unchecked, and a direct API write skips the client entirely.
--
--   Fix: a CHECK constraint, the same form as users_college_length_check in
--   028. char_length counts characters (code points), not bytes.
--   createUserProfile now stores the name normalised as fullNameSchema does
--   and cut to 100 code points, so a long provider name is clipped instead of
--   failing sign-up against this constraint.
--
--   Existing rows: at the time of writing staging's longest full_name was 17
--   characters and none exceeded 100, so ADD CONSTRAINT validates cleanly. If
--   a row somewhere does exceed it, the ALTER fails and changes nothing; trim
--   that row first, then re-run.
--
-- Not idempotent: re-running after it succeeds fails with "constraint already
-- exists" and changes nothing.
--
-- Rollback (forward-only): a new migration that runs
--   ALTER TABLE users DROP CONSTRAINT users_full_name_length_check;

ALTER TABLE users
  ADD CONSTRAINT users_full_name_length_check
    CHECK (char_length(full_name) <= 100);
