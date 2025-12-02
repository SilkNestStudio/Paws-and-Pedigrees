-- Add puppy training fields to dogs table
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS completed_puppy_training JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS active_puppy_training TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS training_completion_time TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_unlocked_third_slot BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN dogs.completed_puppy_training IS 'Array of completed puppy training program IDs';
COMMENT ON COLUMN dogs.active_puppy_training IS 'ID of currently active training program';
COMMENT ON COLUMN dogs.training_completion_time IS 'When active training program completes';
COMMENT ON COLUMN dogs.has_unlocked_third_slot IS 'Whether 3rd training slot was purchased';

-- Create index for active training queries
CREATE INDEX IF NOT EXISTS idx_dogs_active_training ON dogs(active_puppy_training) WHERE active_puppy_training IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dogs_training_completion ON dogs(training_completion_time) WHERE training_completion_time IS NOT NULL;
