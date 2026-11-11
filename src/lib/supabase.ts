import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function createSupabaseClient(url: string | undefined, key: string | undefined) {
  if (!url || !key) return null;
  return createClient(url, key);
}

let browserClient: SupabaseClient | null | undefined;
let adminClient: SupabaseClient | null | undefined;

function getSupabase(): SupabaseClient {
  if (browserClient === undefined) {
    browserClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  if (!browserClient) {
    throw new Error("Supabase is not configured");
  }
  return browserClient;
}

function getSupabaseAdmin(): SupabaseClient {
  if (adminClient === undefined) {
    adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  if (!adminClient) {
    throw new Error("Supabase is not configured");
  }
  return adminClient;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Server-side client (with service role)
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseAdmin();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
