-- Migration 007: Add email_verified column to users table
-- Non-destructive additive change. Existing rows default to false.
-- The verification gate only applies to the new signup flow;
-- existing authenticated users are unaffected.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
