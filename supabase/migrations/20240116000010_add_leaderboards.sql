-- Add leaderboard and rankings system
-- This migration creates tables to track competition scores and rankings

-- Competition scores table - tracks individual competition results
CREATE TABLE IF NOT EXISTS competition_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE NOT NULL,
  competition_type VARCHAR(50) NOT NULL, -- 'agility', 'racing', 'obedience', 'weight_pull', 'conformation'
  tier VARCHAR(20) NOT NULL, -- 'local', 'regional', 'national'
  score INTEGER NOT NULL,
  placement INTEGER, -- Final placement (1-8)
  minigame_score INTEGER, -- Raw minigame score (0-100+)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_id TEXT REFERENCES competition_events(id) ON DELETE SET NULL,

  -- Indexes for fast queries
  CONSTRAINT valid_competition_type CHECK (competition_type IN ('agility', 'racing', 'obedience', 'weight_pull', 'conformation')),
  CONSTRAINT valid_tier CHECK (tier IN ('local', 'regional', 'national')),
  CONSTRAINT valid_placement CHECK (placement >= 1 AND placement <= 8)
);

-- Create indexes for leaderboard queries
CREATE INDEX idx_competition_scores_user ON competition_scores(user_id);
CREATE INDEX idx_competition_scores_dog ON competition_scores(dog_id);
CREATE INDEX idx_competition_scores_type_tier ON competition_scores(competition_type, tier);
CREATE INDEX idx_competition_scores_created_at ON competition_scores(created_at DESC);
CREATE INDEX idx_competition_scores_score ON competition_scores(score DESC);

-- Dog championship stats table - aggregated stats per dog
CREATE TABLE IF NOT EXISTS dog_championship_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Overall stats
  total_competitions INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,

  -- Per-competition type stats
  agility_competitions INTEGER DEFAULT 0,
  agility_wins INTEGER DEFAULT 0,
  agility_best_score INTEGER DEFAULT 0,

  racing_competitions INTEGER DEFAULT 0,
  racing_wins INTEGER DEFAULT 0,
  racing_best_score INTEGER DEFAULT 0,

  obedience_competitions INTEGER DEFAULT 0,
  obedience_wins INTEGER DEFAULT 0,
  obedience_best_score INTEGER DEFAULT 0,

  weight_pull_competitions INTEGER DEFAULT 0,
  weight_pull_wins INTEGER DEFAULT 0,
  weight_pull_best_score INTEGER DEFAULT 0,

  conformation_competitions INTEGER DEFAULT 0,
  conformation_wins INTEGER DEFAULT 0,
  conformation_best_score INTEGER DEFAULT 0,

  -- Rankings
  global_rank INTEGER,
  breed_rank INTEGER,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dog_championship_stats_dog ON dog_championship_stats(dog_id);
CREATE INDEX idx_dog_championship_stats_global_rank ON dog_championship_stats(global_rank);
CREATE INDEX idx_dog_championship_stats_total_points ON dog_championship_stats(total_points DESC);

-- User leaderboard stats - aggregated stats per user
CREATE TABLE IF NOT EXISTS user_leaderboard_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Overall stats
  total_competitions INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_championship_points INTEGER DEFAULT 0,
  total_prize_money INTEGER DEFAULT 0,

  -- Per-competition type
  agility_wins INTEGER DEFAULT 0,
  racing_wins INTEGER DEFAULT 0,
  obedience_wins INTEGER DEFAULT 0,
  weight_pull_wins INTEGER DEFAULT 0,
  conformation_wins INTEGER DEFAULT 0,

  -- Champions owned
  champions_owned INTEGER DEFAULT 0,
  grand_champions_owned INTEGER DEFAULT 0,

  -- Ranking
  global_rank INTEGER,

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_leaderboard_stats_user ON user_leaderboard_stats(user_id);
CREATE INDEX idx_user_leaderboard_stats_global_rank ON user_leaderboard_stats(global_rank);
CREATE INDEX idx_user_leaderboard_stats_total_points ON user_leaderboard_stats(total_championship_points DESC);

-- Enable Row Level Security
ALTER TABLE competition_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_championship_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_leaderboard_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competition_scores
CREATE POLICY "Users can view all competition scores"
  ON competition_scores FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own competition scores"
  ON competition_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own competition scores"
  ON competition_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for dog_championship_stats
CREATE POLICY "Users can view all dog championship stats"
  ON dog_championship_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert stats for their own dogs"
  ON dog_championship_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = dog_championship_stats.dog_id
      AND dogs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stats for their own dogs"
  ON dog_championship_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dogs
      WHERE dogs.id = dog_championship_stats.dog_id
      AND dogs.user_id = auth.uid()
    )
  );

-- RLS Policies for user_leaderboard_stats
CREATE POLICY "Users can view all user leaderboard stats"
  ON user_leaderboard_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own leaderboard stats"
  ON user_leaderboard_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leaderboard stats"
  ON user_leaderboard_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update dog championship stats after competition
CREATE OR REPLACE FUNCTION update_dog_championship_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update dog championship stats
  INSERT INTO dog_championship_stats (
    dog_id,
    total_competitions,
    total_wins,
    total_points
  )
  VALUES (
    NEW.dog_id,
    1,
    CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END,
    NEW.score
  )
  ON CONFLICT (dog_id) DO UPDATE SET
    total_competitions = dog_championship_stats.total_competitions + 1,
    total_wins = dog_championship_stats.total_wins + CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END,
    total_points = dog_championship_stats.total_points + NEW.score,

    -- Update specific competition type stats
    agility_competitions = CASE WHEN NEW.competition_type = 'agility'
      THEN dog_championship_stats.agility_competitions + 1
      ELSE dog_championship_stats.agility_competitions END,
    agility_wins = CASE WHEN NEW.competition_type = 'agility' AND NEW.placement = 1
      THEN dog_championship_stats.agility_wins + 1
      ELSE dog_championship_stats.agility_wins END,
    agility_best_score = CASE WHEN NEW.competition_type = 'agility'
      THEN GREATEST(dog_championship_stats.agility_best_score, NEW.score)
      ELSE dog_championship_stats.agility_best_score END,

    racing_competitions = CASE WHEN NEW.competition_type = 'racing'
      THEN dog_championship_stats.racing_competitions + 1
      ELSE dog_championship_stats.racing_competitions END,
    racing_wins = CASE WHEN NEW.competition_type = 'racing' AND NEW.placement = 1
      THEN dog_championship_stats.racing_wins + 1
      ELSE dog_championship_stats.racing_wins END,
    racing_best_score = CASE WHEN NEW.competition_type = 'racing'
      THEN GREATEST(dog_championship_stats.racing_best_score, NEW.score)
      ELSE dog_championship_stats.racing_best_score END,

    obedience_competitions = CASE WHEN NEW.competition_type = 'obedience'
      THEN dog_championship_stats.obedience_competitions + 1
      ELSE dog_championship_stats.obedience_competitions END,
    obedience_wins = CASE WHEN NEW.competition_type = 'obedience' AND NEW.placement = 1
      THEN dog_championship_stats.obedience_wins + 1
      ELSE dog_championship_stats.obedience_wins END,
    obedience_best_score = CASE WHEN NEW.competition_type = 'obedience'
      THEN GREATEST(dog_championship_stats.obedience_best_score, NEW.score)
      ELSE dog_championship_stats.obedience_best_score END,

    weight_pull_competitions = CASE WHEN NEW.competition_type = 'weight_pull'
      THEN dog_championship_stats.weight_pull_competitions + 1
      ELSE dog_championship_stats.weight_pull_competitions END,
    weight_pull_wins = CASE WHEN NEW.competition_type = 'weight_pull' AND NEW.placement = 1
      THEN dog_championship_stats.weight_pull_wins + 1
      ELSE dog_championship_stats.weight_pull_wins END,
    weight_pull_best_score = CASE WHEN NEW.competition_type = 'weight_pull'
      THEN GREATEST(dog_championship_stats.weight_pull_best_score, NEW.score)
      ELSE dog_championship_stats.weight_pull_best_score END,

    conformation_competitions = CASE WHEN NEW.competition_type = 'conformation'
      THEN dog_championship_stats.conformation_competitions + 1
      ELSE dog_championship_stats.conformation_competitions END,
    conformation_wins = CASE WHEN NEW.competition_type = 'conformation' AND NEW.placement = 1
      THEN dog_championship_stats.conformation_wins + 1
      ELSE dog_championship_stats.conformation_wins END,
    conformation_best_score = CASE WHEN NEW.competition_type = 'conformation'
      THEN GREATEST(dog_championship_stats.conformation_best_score, NEW.score)
      ELSE dog_championship_stats.conformation_best_score END,

    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update dog championship stats
CREATE TRIGGER trigger_update_dog_championship_stats
  AFTER INSERT ON competition_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_dog_championship_stats();

-- Function to update user leaderboard stats after competition
CREATE OR REPLACE FUNCTION update_user_leaderboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update user leaderboard stats
  INSERT INTO user_leaderboard_stats (
    user_id,
    total_competitions,
    total_wins,
    total_championship_points
  )
  VALUES (
    NEW.user_id,
    1,
    CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END,
    NEW.score
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_competitions = user_leaderboard_stats.total_competitions + 1,
    total_wins = user_leaderboard_stats.total_wins + CASE WHEN NEW.placement = 1 THEN 1 ELSE 0 END,
    total_championship_points = user_leaderboard_stats.total_championship_points + NEW.score,

    -- Update specific competition type wins
    agility_wins = CASE WHEN NEW.competition_type = 'agility' AND NEW.placement = 1
      THEN user_leaderboard_stats.agility_wins + 1
      ELSE user_leaderboard_stats.agility_wins END,
    racing_wins = CASE WHEN NEW.competition_type = 'racing' AND NEW.placement = 1
      THEN user_leaderboard_stats.racing_wins + 1
      ELSE user_leaderboard_stats.racing_wins END,
    obedience_wins = CASE WHEN NEW.competition_type = 'obedience' AND NEW.placement = 1
      THEN user_leaderboard_stats.obedience_wins + 1
      ELSE user_leaderboard_stats.obedience_wins END,
    weight_pull_wins = CASE WHEN NEW.competition_type = 'weight_pull' AND NEW.placement = 1
      THEN user_leaderboard_stats.weight_pull_wins + 1
      ELSE user_leaderboard_stats.weight_pull_wins END,
    conformation_wins = CASE WHEN NEW.competition_type = 'conformation' AND NEW.placement = 1
      THEN user_leaderboard_stats.conformation_wins + 1
      ELSE user_leaderboard_stats.conformation_wins END,

    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update user leaderboard stats
CREATE TRIGGER trigger_update_user_leaderboard_stats
  AFTER INSERT ON competition_scores
  FOR EACH ROW
  EXECUTE FUNCTION update_user_leaderboard_stats();
