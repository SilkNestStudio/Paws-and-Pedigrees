-- Migration to add water/thirst tracking system to dogs table
-- Run this in your Supabase SQL Editor

-- Add last_watered column to track when dog was last given water
ALTER TABLE public.dogs
ADD COLUMN IF NOT EXISTS last_watered TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing dogs to have last_watered set to now
UPDATE public.dogs
SET last_watered = COALESCE(last_watered, NOW())
WHERE last_watered IS NULL;

-- Add thirst column if it doesn't exist (0-100, where 100 is fully hydrated)
ALTER TABLE public.dogs
ADD COLUMN IF NOT EXISTS thirst INTEGER DEFAULT 100;

-- Update existing dogs to have thirst at 100 (fully hydrated)
UPDATE public.dogs
SET thirst = COALESCE(thirst, 100)
WHERE thirst IS NULL;

-- Add check constraint to ensure thirst is between 0 and 100
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'dogs_thirst_check'
    ) THEN
        ALTER TABLE public.dogs
        ADD CONSTRAINT dogs_thirst_check CHECK (thirst >= 0 AND thirst <= 100);
    END IF;
END $$;
