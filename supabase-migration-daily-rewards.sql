-- Migration to add daily login rewards fields to profiles table
-- Run this in your Supabase SQL Editor if your profiles table doesn't have these fields

-- Add login tracking fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_streak_claim TIMESTAMP WITH TIME ZONE;

-- Add skill fields if they don't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS training_skill INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS care_knowledge INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS breeding_expertise INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS business_acumen INTEGER DEFAULT 1;

-- Update existing users to have default values
UPDATE public.profiles
SET
  login_streak = COALESCE(login_streak, 0),
  last_login = COALESCE(last_login, NOW()),
  training_skill = COALESCE(training_skill, 1),
  care_knowledge = COALESCE(care_knowledge, 1),
  breeding_expertise = COALESCE(breeding_expertise, 1),
  business_acumen = COALESCE(business_acumen, 1);
