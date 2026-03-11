import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service role client for API routes (no cookies needed — no auth)
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
