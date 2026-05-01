import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local " +
        "(required when VITE_DATA_SOURCE=supabase)"
      );
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
