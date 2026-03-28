// Server-side only — never import this in client components.
// SUPABASE_SECRET_KEY is not prefixed NEXT_PUBLIC_ and will be
// undefined (and harmless) if accidentally bundled on the client.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SECRET_KEY!;

export const supabaseServer = createClient(url, key, {
  auth: { persistSession: false },
});
