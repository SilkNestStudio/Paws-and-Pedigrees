-- Add specialization system to dogs
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS specialization JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN dogs.specialization IS 'Stores specialization path and progression for the dog';

-- Create index for faster specialization queries
CREATE INDEX IF NOT EXISTS idx_dogs_specialization ON dogs USING gin(specialization);

-- Create index for specialization type lookups
CREATE INDEX IF NOT EXISTS idx_dogs_specialization_type ON dogs ((specialization->>'specializationType'));
