-- Paws & Pedigrees Database Schema for Supabase
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  kennel_name TEXT NOT NULL,
  cash INTEGER DEFAULT 500,
  gems INTEGER DEFAULT 50,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  kennel_level INTEGER DEFAULT 1,
  competition_wins_local INTEGER DEFAULT 0,
  competition_wins_regional INTEGER DEFAULT 0,
  competition_wins_national INTEGER DEFAULT 0,
  competition_strategy INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dogs table
CREATE TABLE public.dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  breed_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
  birth_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Base stats
  size INTEGER NOT NULL,
  energy INTEGER NOT NULL,
  friendliness INTEGER NOT NULL,
  trainability INTEGER NOT NULL,
  intelligence INTEGER NOT NULL,
  speed INTEGER NOT NULL,
  agility INTEGER NOT NULL,
  strength INTEGER NOT NULL,
  endurance INTEGER NOT NULL,
  prey_drive INTEGER NOT NULL,
  protectiveness INTEGER NOT NULL,

  -- Trained stats
  speed_trained REAL DEFAULT 0,
  agility_trained REAL DEFAULT 0,
  strength_trained REAL DEFAULT 0,
  endurance_trained REAL DEFAULT 0,
  obedience_trained REAL DEFAULT 0,

  -- Appearance
  coat_type TEXT NOT NULL,
  coat_color TEXT NOT NULL,
  coat_pattern TEXT NOT NULL,
  eye_color TEXT NOT NULL,

  -- Care stats
  hunger INTEGER DEFAULT 100 CHECK (hunger BETWEEN 0 AND 100),
  happiness INTEGER DEFAULT 100 CHECK (happiness BETWEEN 0 AND 100),
  energy_stat INTEGER DEFAULT 100 CHECK (energy_stat BETWEEN 0 AND 100),
  health INTEGER DEFAULT 100 CHECK (health BETWEEN 0 AND 100),

  -- Training
  training_points INTEGER DEFAULT 100,
  training_sessions_today INTEGER DEFAULT 0,
  last_training_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Bond
  bond_level INTEGER DEFAULT 0 CHECK (bond_level BETWEEN 0 AND 10),
  bond_xp INTEGER DEFAULT 0,

  -- Origin
  is_rescue BOOLEAN DEFAULT false,
  rescue_story TEXT,
  parent1_id UUID REFERENCES public.dogs(id),
  parent2_id UUID REFERENCES public.dogs(id),

  -- Genetics
  genetics JSONB,

  -- Breeding
  age_weeks INTEGER DEFAULT 0,
  is_pregnant BOOLEAN DEFAULT false,
  pregnancy_due TIMESTAMP WITH TIME ZONE,
  last_bred TIMESTAMP WITH TIME ZONE,
  litter_size INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_fed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_played TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_bond CHECK (bond_level >= 0 AND bond_level <= 10)
);

-- Competition Results table (optional - for tracking history)
CREATE TABLE public.competition_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  competition_type TEXT NOT NULL,
  tier TEXT NOT NULL,
  placement INTEGER NOT NULL,
  score INTEGER NOT NULL,
  prize_money INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stud Marketplace table (player-to-player breeding)
CREATE TABLE public.stud_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stud_fee INTEGER NOT NULL DEFAULT 100,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stud_listings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Dogs policies
CREATE POLICY "Users can view own dogs"
  ON public.dogs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dogs"
  ON public.dogs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dogs"
  ON public.dogs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dogs"
  ON public.dogs FOR DELETE
  USING (auth.uid() = user_id);

-- Competition results policies
CREATE POLICY "Users can view own competition results"
  ON public.competition_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competition results"
  ON public.competition_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Stud listings policies
CREATE POLICY "Anyone can view stud listings"
  ON public.stud_listings FOR SELECT
  USING (true);

CREATE POLICY "Users can create own listings"
  ON public.stud_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON public.stud_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, kennel_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'kennel_name', 'My Kennel')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Indexes for better performance
CREATE INDEX dogs_user_id_idx ON public.dogs(user_id);
CREATE INDEX dogs_breed_id_idx ON public.dogs(breed_id);
CREATE INDEX competition_results_user_id_idx ON public.competition_results(user_id);
CREATE INDEX competition_results_dog_id_idx ON public.competition_results(dog_id);
CREATE INDEX stud_listings_user_id_idx ON public.stud_listings(user_id);
CREATE INDEX stud_listings_dog_id_idx ON public.stud_listings(dog_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
