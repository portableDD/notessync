import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

let supabaseClientInstance: ReturnType<typeof createBrowserClient> | null =
  null;

export function getSupabaseClient() {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient();
  }
  return supabaseClientInstance;
}
