# Supabase Setup Guide for Paws & Pedigrees

## Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - **Name**: Paws and Pedigrees
   - **Database Password**: (save this somewhere safe!)
   - **Region**: Choose closest to you
5. Wait for project to finish setting up (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (the `anon` key, NOT the `service_role` key!)

## Step 3: Create .env File

1. In your project root folder, create a new file called `.env` (no extension!)
2. Copy this into it, replacing with your actual values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file
4. **IMPORTANT**: Make sure `.env` is in your `.gitignore` file (it should be)

## Step 4: Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the `supabase-schema.sql` file in your project folder
4. Copy ALL the SQL code
5. Paste it into the Supabase SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. You should see "Success. No rows returned" - that's good!

## Step 5: Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see these tables:
   - `profiles`
   - `dogs`
   - `competition_results`

## Step 6: Enable Email Authentication (Optional but recommended)

1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. For development, you can disable email confirmations:
   - Go to **Authentication** → **Settings**
   - Uncheck "Enable email confirmations" (for testing only!)

## Step 7: Test It Out!

1. Restart your development server (npm run dev)
2. The app should now use Supabase for authentication and data storage
3. Create a new account to test
4. Your dogs and progress will now be saved to the cloud!

## Troubleshooting

**Error: "Missing Supabase environment variables"**
- Make sure your `.env` file is in the project ROOT folder
- Make sure it's named exactly `.env` (not `.env.txt`)
- Restart your dev server after creating/editing `.env`

**Error: "Invalid API key"**
- Double-check you copied the `anon` key, not the `service_role` key
- Make sure there are no extra spaces in your `.env` file

**Tables not created**
- Make sure you ran ALL the SQL code in the schema file
- Check for any errors in the SQL Editor output

**Can't sign up/login**
- Make sure Email provider is enabled in Authentication settings
- Check the Supabase logs: **Authentication** → **Logs**

## Next Steps

Once connected, you can:
- View your users in the Supabase dashboard
- See all dog data in the Table Editor
- Monitor API usage in the Dashboard
- Set up real-time subscriptions for multiplayer features (future)

Need help? Check the Supabase docs: https://supabase.com/docs
