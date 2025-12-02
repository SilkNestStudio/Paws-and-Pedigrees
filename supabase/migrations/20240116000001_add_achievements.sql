-- Add achievements system to user profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.achievements IS 'Stores unlocked achievements for the user';

-- Create index for faster achievement queries
CREATE INDEX IF NOT EXISTS idx_profiles_achievements ON profiles USING gin(achievements);
