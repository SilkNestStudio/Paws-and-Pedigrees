-- Add staff system to user profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS staff JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS prestige_points INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN profiles.staff IS 'Stores hired kennel staff members';
COMMENT ON COLUMN profiles.prestige_points IS 'Total prestige points from all owned dogs';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_staff ON profiles USING gin(staff);
CREATE INDEX IF NOT EXISTS idx_profiles_prestige_points ON profiles(prestige_points DESC);

-- Add check constraint for prestige points
ALTER TABLE profiles
ADD CONSTRAINT chk_user_prestige_points_non_negative CHECK (prestige_points >= 0);
