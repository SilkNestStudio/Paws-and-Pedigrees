-- Add genetics system to dogs if not exists
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS genetics JSONB DEFAULT NULL;

-- Add thirst/water system if not exists
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS thirst INTEGER DEFAULT 100 CHECK (thirst >= 0 AND thirst <= 100),
ADD COLUMN IF NOT EXISTS last_watered TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add TP refills tracking if not exists
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS tp_refills_today INTEGER DEFAULT 0 CHECK (tp_refills_today >= 0);

-- Add breed composition for mixed breeds if not exists
ALTER TABLE dogs
ADD COLUMN IF NOT EXISTS breed_composition JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN dogs.genetics IS 'Stores genetic information for breeding calculations';
COMMENT ON COLUMN dogs.thirst IS 'Water level from 0-100';
COMMENT ON COLUMN dogs.last_watered IS 'Last time the dog was given water';
COMMENT ON COLUMN dogs.tp_refills_today IS 'Number of times TP was refilled with gems today';
COMMENT ON COLUMN dogs.breed_composition IS 'Breed composition for mixed breeds and designer breeds';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dogs_genetics ON dogs USING gin(genetics);
CREATE INDEX IF NOT EXISTS idx_dogs_breed_composition ON dogs USING gin(breed_composition);
