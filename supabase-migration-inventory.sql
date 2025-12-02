-- Migration to add inventory system to profiles table
-- Run this in your Supabase SQL Editor if your profiles table doesn't have the inventory field

-- Add inventory field as JSONB to store user's items
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb;

-- Update existing users to have empty inventory array
UPDATE public.profiles
SET inventory = COALESCE(inventory, '[]'::jsonb)
WHERE inventory IS NULL;

-- Create an index on inventory for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_inventory ON public.profiles USING GIN (inventory);

-- Optional: Add a comment explaining the inventory structure
COMMENT ON COLUMN public.profiles.inventory IS 'User inventory stored as JSONB array. Each item has: itemId (string), quantity (number), and optional activeBoost object with multiplier and expiresAt timestamp.';
