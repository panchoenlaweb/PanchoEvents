import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY ?? 'placeholder-service-key';

// Server-side singleton — uses service role key (bypasses RLS).
// NEVER import this in client components or expose to the browser.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
