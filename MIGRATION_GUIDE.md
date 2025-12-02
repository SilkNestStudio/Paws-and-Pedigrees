# Competition System Migration & Launch Guide

## Overview
This guide walks you through deploying the complete competition system to your Supabase database.

## Prerequisites
- Access to your Supabase project dashboard
- SQL Editor access in Supabase
- Backup of your current database (recommended)

---

## Migration Steps

### Step 1: Backup Your Database (CRITICAL)
Before running any migrations, create a backup:
1. Go to your Supabase Dashboard
2. Navigate to Database → Backups
3. Create a manual backup or ensure automatic backups are enabled

### Step 2: Run Migrations in Order

**IMPORTANT:** Run these migrations in the exact order listed. Each migration builds on the previous one.

#### Migration 1: Puppy Training Fields
**File:** `supabase/migrations/20240116000007_add_puppy_training_fields.sql`

**What it does:**
- Adds fields to support puppy training system
- Adds `active_puppy_training`, `puppy_training_started_at`, `puppy_training_program` to dogs table

**To run:**
1. Open Supabase SQL Editor
2. Copy the entire contents of the file
3. Paste into SQL Editor
4. Click "Run"
5. Verify: `Success. No rows returned`

#### Migration 2: Additional Dog Fields
**File:** `supabase/migrations/20240116000008_add_additional_dog_fields.sql`

**What it does:**
- Adds competition-related stats to dogs table
- Adds `obedience_trained`, `speed_trained`, `agility_trained`, `strength_trained`, `endurance_trained`
- Adds `energy_stat` for tracking dog energy levels

**To run:**
1. Open Supabase SQL Editor
2. Copy the entire contents of the file
3. Paste into SQL Editor
4. Click "Run"
5. Verify: `Success. No rows returned`

#### Migration 3: Competition System
**File:** `supabase/migrations/20240116000009_add_competition_system.sql`

**What it does:**
- Creates `competition_events` table for scheduled events
- Creates `event_registrations` table for tracking dog registrations
- Adds championship tracking fields to dogs table
- Sets up Row Level Security (RLS) policies
- Creates functions for event generation

**To run:**
1. Open Supabase SQL Editor
2. Copy the entire contents of the file
3. Paste into SQL Editor
4. Click "Run"
5. Verify: `Success. No rows returned`

**Post-Migration Verification:**
```sql
-- Check that tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('competition_events', 'event_registrations');

-- Should return 2 rows
```

#### Migration 4: Leaderboards & Rankings
**File:** `supabase/migrations/20240116000010_add_leaderboards.sql`

**What it does:**
- Creates `competition_scores` table for individual results
- Creates `dog_championship_stats` table for aggregated dog stats
- Creates `user_leaderboard_stats` table for user/kennel rankings
- Sets up automatic triggers to update stats
- Includes all 5 competition types: agility, racing, obedience, weight_pull, conformation

**To run:**
1. Open Supabase SQL Editor
2. Copy the entire contents of the file
3. Paste into SQL Editor
4. Click "Run"
5. Verify: `Success. No rows returned`

**Post-Migration Verification:**
```sql
-- Check that tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('competition_scores', 'dog_championship_stats', 'user_leaderboard_stats');

-- Should return 3 rows

-- Check that triggers were created
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name IN ('trigger_update_dog_championship_stats', 'trigger_update_user_leaderboard_stats');

-- Should return 2 rows
```

---

## Post-Migration Verification

### 1. Verify All Tables Exist
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%competition%' OR table_name LIKE '%event%' OR table_name LIKE '%leaderboard%'
ORDER BY table_name;
```

Expected results:
- `competition_events`
- `competition_scores`
- `dog_championship_stats`
- `event_registrations`
- `user_leaderboard_stats`

### 2. Verify RLS Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('competition_events', 'event_registrations', 'competition_scores', 'dog_championship_stats', 'user_leaderboard_stats')
ORDER BY tablename, policyname;
```

Should return multiple policies for each table.

### 3. Verify Triggers
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%competition%' OR trigger_name LIKE '%leaderboard%';
```

Should return:
- `trigger_update_dog_championship_stats` on `competition_scores`
- `trigger_update_user_leaderboard_stats` on `competition_scores`

---

## Troubleshooting

### Error: "relation already exists"
**Cause:** Migration was already run or partially run.
**Solution:**
- If tables exist and are correct, skip that migration
- To start fresh: Drop the tables and re-run (⚠️ DATA LOSS WARNING)
```sql
-- CAUTION: This will delete all data in these tables!
DROP TABLE IF EXISTS competition_scores CASCADE;
DROP TABLE IF EXISTS dog_championship_stats CASCADE;
DROP TABLE IF EXISTS user_leaderboard_stats CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS competition_events CASCADE;
```

### Error: "column already exists"
**Cause:** Some columns were added in a previous attempt.
**Solution:** The migration uses `IF NOT EXISTS` where possible. You can skip that specific migration.

### Error: "foreign key constraint cannot be implemented"
**Cause:** Type mismatch between foreign key columns.
**Solution:** Ensure migrations are run in the correct order. Migration 4 requires Migration 3 to be completed first.

### Error: "function does not exist: uuid_generate_v4()"
**Cause:** UUID extension not enabled.
**Solution:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

---

## Testing the Competition System

### 1. Test Competition Registration
1. Log into your app
2. Navigate to Competitions view
3. Select a dog
4. Select a competition type (Agility, Racing, Obedience, Weight Pull, or Conformation)
5. Click "Manual Play" to test a minigame

### 2. Test Leaderboards
1. Complete at least one competition
2. Check that your score appears in leaderboards
3. Verify stats are updating correctly

### 3. Verify Database Updates
```sql
-- Check if scores are being recorded
SELECT * FROM competition_scores ORDER BY created_at DESC LIMIT 5;

-- Check if dog stats are updating
SELECT * FROM dog_championship_stats LIMIT 5;

-- Check if user stats are updating
SELECT * FROM user_leaderboard_stats LIMIT 5;
```

---

## Rollback Instructions (Emergency Only)

If you need to completely rollback the competition system:

```sql
-- CAUTION: This will delete ALL competition data!
-- Make sure you have a backup before running this!

-- Drop tables in reverse order
DROP TABLE IF EXISTS user_leaderboard_stats CASCADE;
DROP TABLE IF EXISTS dog_championship_stats CASCADE;
DROP TABLE IF EXISTS competition_scores CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS competition_events CASCADE;

-- Remove columns added to dogs table
ALTER TABLE dogs DROP COLUMN IF EXISTS active_puppy_training CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS puppy_training_started_at CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS puppy_training_program CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS obedience_trained CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS speed_trained CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS agility_trained CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS strength_trained CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS endurance_trained CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS energy_stat CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS championship_points CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS major_wins CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS current_title CASCADE;
ALTER TABLE dogs DROP COLUMN IF EXISTS title_earned_at CASCADE;
```

---

## Support

If you encounter any issues during migration:
1. Check the troubleshooting section above
2. Verify you ran migrations in the correct order
3. Check Supabase logs for detailed error messages
4. Create an issue at: https://github.com/anthropics/claude-code/issues

---

## Migration Checklist

- [ ] Database backup created
- [ ] Migration 1 (Puppy Training Fields) completed successfully
- [ ] Migration 2 (Additional Dog Fields) completed successfully
- [ ] Migration 3 (Competition System) completed successfully
- [ ] Migration 4 (Leaderboards) completed successfully
- [ ] Post-migration verification completed
- [ ] All tables exist and have correct structure
- [ ] RLS policies are active
- [ ] Triggers are functioning
- [ ] Test competition completed successfully
- [ ] Leaderboard updates verified
- [ ] System ready for launch! 🎉
