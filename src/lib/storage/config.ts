/** Cloud access is opt-in; existing Supabase credentials never enable it implicitly. */
export const isLocalMode = import.meta.env?.VITE_STORAGE_MODE !== 'supabase';
export const SAVE_KEY = 'paws-and-pedigrees-storage';
