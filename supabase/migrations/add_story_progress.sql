-- Create story_progress table
CREATE TABLE IF NOT EXISTS story_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_chapter TEXT,
  completed_chapters TEXT[] DEFAULT '{}',
  chapter_objectives JSONB DEFAULT '{}',
  claimed_rewards TEXT[] DEFAULT '{}',
  story_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add RLS policies for story_progress
ALTER TABLE story_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own story progress
CREATE POLICY "Users can read own story progress"
  ON story_progress
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own story progress
CREATE POLICY "Users can insert own story progress"
  ON story_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own story progress
CREATE POLICY "Users can update own story progress"
  ON story_progress
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own story progress
CREATE POLICY "Users can delete own story progress"
  ON story_progress
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_story_progress_user_id ON story_progress(user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_story_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_story_progress_updated_at
  BEFORE UPDATE ON story_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_story_progress_updated_at();
