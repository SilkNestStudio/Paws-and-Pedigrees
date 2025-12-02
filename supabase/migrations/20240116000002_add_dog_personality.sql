-- Add personality system to dogs
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS personality JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN dogs.personality IS 'Stores personality traits and quirks for the dog';

-- Create index for faster personality queries
CREATE INDEX IF NOT EXISTS idx_dogs_personality ON dogs USING gin(personality);
