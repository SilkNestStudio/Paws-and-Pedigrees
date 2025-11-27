-- Migration: Add kennel_name to profiles
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- Step 1: Add kennel_name column to existing profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kennel_name TEXT;

-- Step 2: Set default kennel_name for existing users (optional but recommended)
UPDATE public.profiles
SET kennel_name = 'My Kennel'
WHERE kennel_name IS NULL;

-- Step 3: Make kennel_name required (NOT NULL)
ALTER TABLE public.profiles
ALTER COLUMN kennel_name SET NOT NULL;

-- Step 4: Update the handle_new_user function to include kennel_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, kennel_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'kennel_name', 'My Kennel')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done! Your database now supports kennel names.
