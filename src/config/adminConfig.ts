/**
 * Admin Configuration
 *
 * Add user IDs here to grant admin panel access
 */

// List of user IDs that have admin access
export const ADMIN_USER_IDS = [
  // Your admin user ID (needs quotes!)
  'd3c01396-14f6-44e1-8b79-b56facf2c51b',

  // For local development/testing without auth:
  'local-user',

  // Add more admin user IDs below:
  // 'your-supabase-user-id-here',
];

/**
 * Check if a user ID has admin access
 */
export function isAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * How to find your user ID:
 *
 * 1. Open browser console (F12)
 * 2. Type: localStorage.getItem('game-storage')
 * 3. Look for the "id" field in the user object
 * 4. Copy that ID and add it to ADMIN_USER_IDS array above
 *
 * OR
 *
 * 1. Log in to your game
 * 2. Open Settings > Admin Panel (it will show a message with your ID)
 * 3. Copy that ID and add it to the array above
 */
