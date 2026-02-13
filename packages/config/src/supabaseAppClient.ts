import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다.");
  }
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.");
  }

  return { url, anonKey };
}

export function supabaseAppClient() {
  if (browserClient) return browserClient;

  const { url, anonKey } = getSupabaseConfig();

  browserClient = createBrowserClient(url, anonKey, {
    cookieEncoding: "base64url",
  });

  return browserClient;
}
