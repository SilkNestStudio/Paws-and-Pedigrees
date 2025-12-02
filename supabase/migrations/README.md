# Database Migrations

This directory contains Supabase migration files for the Paws & Pedigrees game.

## Migration Files

### Weather System
- **20240116000000_add_weather_system.sql** - Adds weather and seasonal system to user profiles

### Achievements
- **20240116000001_add_achievements.sql** - Adds achievement tracking to user profiles

### Dog Personality
- **20240116000002_add_dog_personality.sql** - Adds personality system to dogs

### Dog Specialization
- **20240116000003_add_dog_specialization.sql** - Adds career specialization paths for dogs

### Dog Certifications
- **20240116000004_add_dog_certifications.sql** - Adds certification and prestige system for dogs

### Staff System
- **20240116000005_add_staff_system.sql** - Adds kennel staff management to user profiles

### Inventory
- **20240116000006_add_inventory_system.sql** - Adds item inventory system to user profiles

### Puppy Training
- **20240116000007_add_puppy_training_fields.sql** - Adds puppy training program fields to dogs

### Additional Dog Fields
- **20240116000008_add_additional_dog_fields.sql** - Adds genetics, thirst, TP refills, and breed composition fields

## How to Apply Migrations

### Using Supabase CLI

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Apply migrations:
   ```bash
   supabase db push
   ```

### Manual Application

Alternatively, you can manually apply these migrations through the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of each migration file in order
4. Execute each migration

## Migration Order

Migrations should be applied in numerical order:
1. Weather system
2. Achievements
3. Dog personality
4. Dog specialization
5. Dog certifications
6. Staff system
7. Inventory system
8. Puppy training fields
9. Additional dog fields

## Rollback

To rollback migrations, you'll need to create reverse migrations that remove the columns. Example:

```sql
-- Rollback weather system
ALTER TABLE profiles DROP COLUMN IF EXISTS weather;

-- Rollback achievements
DROP INDEX IF EXISTS idx_profiles_achievements;
ALTER TABLE profiles DROP COLUMN IF EXISTS achievements;

-- etc.
```

## Notes

- All migrations use `IF NOT EXISTS` / `IF EXISTS` clauses to be idempotent
- Indexes are created for commonly queried fields to improve performance
- JSONB columns are used for complex nested data structures
- Check constraints ensure data integrity (e.g., non-negative prestige points)
- Comments are added to columns for better documentation

## Testing

After applying migrations, verify:
1. All columns exist in the database
2. Indexes are created successfully
3. Default values are set correctly
4. Check constraints work as expected
5. Application can read/write to new fields without errors
