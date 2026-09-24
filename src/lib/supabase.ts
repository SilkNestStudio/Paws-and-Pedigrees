import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isLocalMode } from './storage/config';
let client: SupabaseClient | undefined;
// Lazy initialization keeps local play independent of credentials and auth refresh traffic.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (isLocalMode) throw new Error('This feature requires cloud mode.');
    if (!client) {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Cloud mode needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      client = createClient(url, key);
    }
    const value = Reflect.get(client, property);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
