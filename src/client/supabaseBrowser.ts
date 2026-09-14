import { createClient } from "@supabase/supabase-js";

/*
 * The browser's Supabase client: only used for Realtime broadcast (the shared editor). The publishable
 * key is safe here because RLS keeps every table closed; all reads and writes go through the API routes.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;
if (url === undefined || url === "" || key === undefined || key === "") {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY must be set (see .env.example)");
}

export const supabaseBrowser = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
