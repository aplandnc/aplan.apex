import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

export async function createSupabaseAppServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component에서는 쿠키 설정이 실패할 수 있음
          // 이 경우 무시하고 진행 (읽기 전용 작업에서 발생)
        }
      },
    },
  });
}

// ✅ 기존 코드에서 supabaseAppServer()로 쓰던 데가 있으면 안 깨지게 별칭 유지
export const supabaseAppServer = createSupabaseAppServerClient;
