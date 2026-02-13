import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CookieOptions = {
  path?: string;
  maxAge?: number;
  domain?: string;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

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

export function createSupabaseAppServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", maxAge: 0, ...options });
      },
    },
  });
}

// ✅ 기존 코드에서 supabaseAppServer()로 쓰던 데가 있으면 안 깨지게 별칭 유지
export const supabaseAppServer = createSupabaseAppServerClient;
