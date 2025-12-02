-- Add inventory system to user profiles if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.inventory IS 'Stores user inventory items with quantities and active boosts';

-- Create index for faster inventory queries
CREATE INDEX IF NOT EXISTS idx_profiles_inventory ON profiles USING gin(inventory);
