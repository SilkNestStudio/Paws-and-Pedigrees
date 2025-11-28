# Fixing Supabase Email Verification

## Problem
- Email verification links are broken/don't work
- Users don't know they need to verify their email

## Solution

### Step 1: Configure Site URL in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Set the **Site URL** to your application URL:
   - **For Development**: `http://localhost:5173` (or whatever port Vite uses)
   - **For Production**: `https://yourdomain.com` (your actual deployed URL)

### Step 2: Configure Redirect URLs

In the same **URL Configuration** section:

1. Add **Redirect URLs** (one per line):
   ```
   http://localhost:5173/**
   https://yourdomain.com/**
   ```
   The `**` allows all paths under that domain.

### Step 3: Update Email Templates (Optional but Recommended)

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Make sure the confirmation link uses `{{ .SiteURL }}` or `{{ .ConfirmationURL }}`
4. Default template should work, but if customized, ensure it has:
   ```html
   <a href="{{ .ConfirmationURL }}">Confirm your email</a>
   ```

### Step 4: Test the Flow

1. Sign up with a test email
2. Check your email for the verification link
3. Click the link - it should redirect to your Site URL
4. You should be able to log in successfully

## What Changed in Code

The signup flow now displays:
- ✅ Clear message telling users to check their email
- Better error handling for duplicate accounts
- User-friendly feedback during signup process

## Common Issues

### "Invalid Redirect URL" Error
- Make sure your redirect URL is added to the Redirect URLs list in Supabase
- Check that the Site URL matches your application URL exactly

### Email Not Arriving
- Check spam folder
- Verify email provider settings in Supabase
- Check Supabase logs for email delivery errors

### Link Expired
- Email confirmation links expire after 24 hours by default
- User needs to request a new verification email
- You can change expiry time in **Authentication** → **Email Templates** → **Confirm signup** → Advanced Settings

## Optional: Disable Email Confirmation (Not Recommended for Production)

If you want to disable email confirmation entirely (NOT recommended for production):

1. Go to **Authentication** → **Providers** → **Email**
2. Uncheck **Enable email confirmation**
3. Save

**Warning**: This allows anyone to create accounts without email verification, which can lead to spam accounts and security issues.

## Deployment Checklist

When deploying to production:

- [ ] Update Site URL to production domain
- [ ] Add production domain to Redirect URLs
- [ ] Test signup flow in production
- [ ] Verify email delivery works
- [ ] Check that verification links redirect properly
