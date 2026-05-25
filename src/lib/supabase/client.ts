import { createBrowserClient as createSSRBrowserClient, createServerClient as createSSRServerClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

let browserClient: ReturnType<typeof createSSRBrowserClient> | null = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;
  browserClient = createSSRBrowserClient(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

export async function createServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

let anonClient: SupabaseClient | null = null;

export function createAnonClient() {
  if (anonClient) return anonClient;
  anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  return anonClient;
}