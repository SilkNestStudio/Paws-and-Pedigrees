-- Apply before re-enabling Supabase sync. Local IndexedDB needs no migration.
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS yard_bowls jsonb
  NOT NULL DEFAULT '{"food":false,"water":false}'::jsonb;
