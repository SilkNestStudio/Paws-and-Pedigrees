-- Add certifications and prestige system to dogs
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS prestige_points INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN dogs.certifications IS 'Stores earned certifications and titles for the dog';
COMMENT ON COLUMN dogs.prestige_points IS 'Total prestige points accumulated by the dog';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_dogs_certifications ON dogs USING gin(certifications);
CREATE INDEX IF NOT EXISTS idx_dogs_prestige_points ON dogs(prestige_points DESC);

-- Add check constraint for prestige points
ALTER TABLE dogs
ADD CONSTRAINT chk_prestige_points_non_negative CHECK (prestige_points >= 0);
