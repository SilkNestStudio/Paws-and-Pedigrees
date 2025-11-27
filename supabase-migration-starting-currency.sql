-- Migration: Fix starting cash and gems amounts
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- Update the default values for new users
ALTER TABLE public.profiles
ALTER COLUMN cash SET DEFAULT 500;

ALTER TABLE public.profiles
ALTER COLUMN gems SET DEFAULT 50;

-- Done! New users will now start with $500 cash and 50 gems.
-- Note: This does NOT change existing users' balances, only the defaults for new signups.
