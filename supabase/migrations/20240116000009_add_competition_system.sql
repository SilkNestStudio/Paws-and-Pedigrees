-- Competition System Overhaul Migration
-- Adds championship progression, events, and leaderboards based on AKC model

-- ============================================================================
-- Add Championship Fields to Dogs Table
-- ============================================================================

ALTER TABLE public.dogs
  ADD COLUMN IF NOT EXISTS championship_title TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS championship_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS major_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS judges_won_under TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS qualified_events TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS breed_group TEXT,
  ADD COLUMN IF NOT EXISTS discipline_points JSONB DEFAULT '{
    "conformation": 0,
    "agility": 0,
    "obedience": 0,
    "rally": 0,
    "racing": 0,
    "weight_pull": 0,
    "tracking": 0,
    "herding": 0
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS specialty_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS group_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS all_breed_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_in_show_wins INTEGER DEFAULT 0;

-- Add index for championship queries
CREATE INDEX IF NOT EXISTS idx_dogs_championship_title ON public.dogs(championship_title);
CREATE INDEX IF NOT EXISTS idx_dogs_championship_points ON public.dogs(championship_points DESC);

-- ============================================================================
-- Competition Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.competition_events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  discipline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming',

  -- Scheduling
  registration_opens TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_closes TIMESTAMP WITH TIME ZONE NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  event_duration INTEGER NOT NULL DEFAULT 24, -- hours

  -- Entry requirements
  entry_fee INTEGER NOT NULL,
  min_level INTEGER NOT NULL DEFAULT 1,
  min_age INTEGER NOT NULL DEFAULT 8, -- weeks
  required_title TEXT,
  breed_restriction INTEGER[],
  group_restriction TEXT,

  -- Points and prizes
  points_awarded JSONB NOT NULL DEFAULT '{
    "first": 0,
    "second": 0,
    "third": 0,
    "fourth": 0
  }'::jsonb,
  is_major BOOLEAN NOT NULL DEFAULT false,
  prizes JSONB NOT NULL DEFAULT '{
    "first": 0,
    "second": 0,
    "third": 0,
    "participation": 0
  }'::jsonb,

  -- Competition details
  max_entries INTEGER NOT NULL DEFAULT 100,
  current_entries INTEGER NOT NULL DEFAULT 0,
  judge_id TEXT NOT NULL,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for event queries
CREATE INDEX IF NOT EXISTS idx_events_status ON public.competition_events(status);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.competition_events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.competition_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_discipline ON public.competition_events(discipline);
CREATE INDEX IF NOT EXISTS idx_events_registration ON public.competition_events(registration_opens, registration_closes);

-- ============================================================================
-- Event Registrations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL REFERENCES public.competition_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate registrations
  UNIQUE (event_id, dog_id)
);

-- Indexes for registration queries
CREATE INDEX IF NOT EXISTS idx_registrations_event_id ON public.event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user_id ON public.event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_dog_id ON public.event_registrations(dog_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON public.event_registrations(status);

-- ============================================================================
-- Competition Leaderboards Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.competition_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,

  -- Results
  score REAL NOT NULL,
  placement INTEGER NOT NULL DEFAULT 0,
  championship_points INTEGER NOT NULL DEFAULT 0,
  prize_money INTEGER NOT NULL DEFAULT 0,
  is_major BOOLEAN NOT NULL DEFAULT false,
  judge_id TEXT NOT NULL,

  -- Replay data for ghost competition
  minigame_replay JSONB,
  dog_stats JSONB NOT NULL,

  -- Metadata
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate entries per dog per event
  UNIQUE (event_id, dog_id)
);

-- Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_leaderboards_event_id ON public.competition_leaderboards(event_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user_id ON public.competition_leaderboards(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_dog_id ON public.competition_leaderboards(dog_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_score ON public.competition_leaderboards(event_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_completed_at ON public.competition_leaderboards(completed_at);

-- ============================================================================
-- Competition History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.competition_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  discipline TEXT NOT NULL,

  -- Results
  placement INTEGER NOT NULL,
  score REAL NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  prize_money INTEGER NOT NULL,
  is_major BOOLEAN NOT NULL DEFAULT false,
  judge_id TEXT NOT NULL,

  -- Metadata
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for history queries
CREATE INDEX IF NOT EXISTS idx_history_dog_id ON public.competition_history(dog_id);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON public.competition_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_completed_at ON public.competition_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_event_type ON public.competition_history(event_type);

-- ============================================================================
-- Judges Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.judges (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  specialties TEXT[] NOT NULL,
  group_expertise TEXT,
  reputation INTEGER NOT NULL DEFAULT 3,
  strictness REAL NOT NULL DEFAULT 0.5,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE public.competition_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;

-- Events: Public read access
CREATE POLICY "Events are viewable by everyone"
  ON public.competition_events FOR SELECT
  USING (true);

-- Registrations: Users can view their own registrations
CREATE POLICY "Users can view their own registrations"
  ON public.event_registrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own registrations"
  ON public.event_registrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own registrations"
  ON public.event_registrations FOR UPDATE
  USING (auth.uid() = user_id);

-- Leaderboards: Public read access
CREATE POLICY "Leaderboards are viewable by everyone"
  ON public.competition_leaderboards FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own scores"
  ON public.competition_leaderboards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- History: Users can view their own history
CREATE POLICY "Users can view their own competition history"
  ON public.competition_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON public.competition_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Judges: Public read access
CREATE POLICY "Judges are viewable by everyone"
  ON public.judges FOR SELECT
  USING (true);

-- ============================================================================
-- Functions for Competition Management
-- ============================================================================

-- Function to update event entry count
CREATE OR REPLACE FUNCTION update_event_entry_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.competition_events
    SET current_entries = current_entries + 1
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.competition_events
    SET current_entries = current_entries - 1
    WHERE id = OLD.event_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for entry count
DROP TRIGGER IF EXISTS trigger_update_entry_count ON public.event_registrations;
CREATE TRIGGER trigger_update_entry_count
  AFTER INSERT OR DELETE ON public.event_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_event_entry_count();

-- Function to calculate leaderboard placements
CREATE OR REPLACE FUNCTION calculate_event_placements(p_event_id TEXT)
RETURNS void AS $$
BEGIN
  WITH ranked_scores AS (
    SELECT
      id,
      ROW_NUMBER() OVER (ORDER BY score DESC) as rank
    FROM public.competition_leaderboards
    WHERE event_id = p_event_id
  )
  UPDATE public.competition_leaderboards cl
  SET placement = rs.rank
  FROM ranked_scores rs
  WHERE cl.id = rs.id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Seed Initial Judges
-- ============================================================================

INSERT INTO public.judges (id, name, specialties, group_expertise, reputation, strictness, bio)
VALUES
  ('judge_001', 'Margaret Thompson', ARRAY['conformation', 'agility'], 'sporting', 5, 0.7, 'Distinguished AKC judge with 30 years of experience in sporting breeds.'),
  ('judge_002', 'Dr. Robert Chen', ARRAY['obedience', 'rally'], 'working', 4, 0.6, 'Former veterinarian specializing in canine behavior and obedience training.'),
  ('judge_003', 'Sarah Williams', ARRAY['conformation'], 'toy', 5, 0.8, 'Renowned toy breed specialist and Westminster judge.'),
  ('judge_004', 'James Patterson', ARRAY['agility', 'racing'], 'herding', 4, 0.5, 'Former professional handler with expertise in athletic competitions.'),
  ('judge_005', 'Linda Martinez', ARRAY['weight_pull', 'tracking'], 'working', 3, 0.4, 'Working dog enthusiast with focus on practical skills.'),
  ('judge_006', 'Michael O''Brien', ARRAY['conformation'], 'hound', 5, 0.7, 'Hound group authority with international judging experience.'),
  ('judge_007', 'Emily Foster', ARRAY['obedience', 'agility'], 'terrier', 4, 0.6, 'Dynamic judge known for fair but challenging courses.'),
  ('judge_008', 'David Kim', ARRAY['conformation', 'rally'], 'non_sporting', 4, 0.5, 'All-around judge with specialty in non-sporting breeds.'),
  ('judge_009', 'Patricia González', ARRAY['herding', 'tracking'], 'herding', 5, 0.6, 'Herding dog expert and sheep dog trial champion.'),
  ('judge_010', 'Richard Anderson', ARRAY['conformation'], NULL, 5, 0.9, 'Strict all-breed judge known for upholding breed standards.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.competition_events IS 'Scheduled competition events with registration windows';
COMMENT ON TABLE public.event_registrations IS 'Dog registrations for competition events';
COMMENT ON TABLE public.competition_leaderboards IS 'Event results and leaderboards with replay data';
COMMENT ON TABLE public.competition_history IS 'Historical record of all competition participations';
COMMENT ON TABLE public.judges IS 'Competition judges with specialties and reputation';

COMMENT ON COLUMN public.dogs.championship_title IS 'Current championship title (none, junior_handler, champion, etc.)';
COMMENT ON COLUMN public.dogs.championship_points IS 'Total championship points earned across all competitions';
COMMENT ON COLUMN public.dogs.major_wins IS 'Number of major wins (3+ points) earned';
COMMENT ON COLUMN public.dogs.judges_won_under IS 'Array of judge IDs this dog has won under';
COMMENT ON COLUMN public.dogs.discipline_points IS 'Points earned in each specific discipline';
