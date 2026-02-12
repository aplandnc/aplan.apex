import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // 1. 인가 코드가 없으면 로그인으로 리다이렉트
  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const cookieStore = cookies();
  
  // 기본 리다이렉트 경로 설정
  let redirectPath = "/staff";
  const response = NextResponse.redirect(new URL(redirectPath, url.origin));

  // 2. Supabase 클라이언트 초기화
  // **주의**: .env 파일에 새로 이관된 Supabase의 URL과 KEY가 들어있는지 반드시 확인하세요.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 3. 세션 교환 (카카오 코드를 세션으로 교체)
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !authData?.user) {
    console.error("Auth Error:", authError);
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const user = authData.user;

  // 4. 직원 정보 조회 (users_staff 테이블)
  // **범인 추적**: 데이터가 예전 같다면 여기서 조회하는 'users_staff' 테이블이 
  // 새로운 Supabase DB에도 정확히 이관되었는지 확인이 필요합니다.
  const { data: staff, error: staffError } = await supabase
    .from("users_staff")
    .select("kakao_id, site_id, staff_type, name, rank, hq, team, sales_name, status")
    .eq("kakao_id", user.id)
    .maybeSingle();

  // 5. 등록되지 않은 유저 처리
  if (staffError || !staff) {
    const registerResponse = NextResponse.redirect(new URL("/register", url.origin));

    // 기존 response(세션 쿠키 포함)에서 쿠키를 모두 복사
    response.cookies.getAll().forEach((cookie) => {
      registerResponse.cookies.set(cookie.name, cookie.value, { path: "/" });
    });

    registerResponse.cookies.set("kakao_id", user.id, { path: "/" });
    return registerResponse;
  }

  // 6. 등록된 유저 정보 쿠키 설정
  const staffInfo: Record<string, string> = {
    kakao_id: staff.kakao_id ?? user.id,
    site_id: staff.site_id ?? "",
    staff_type: staff.staff_type ?? "",
    staff_name: staff.name ?? "", // 'name' 필드 매핑 확인
    rank: staff.rank ?? "",
    hq: staff.hq ?? "",
    team: staff.team ?? "",
    sales_name: staff.sales_name ?? "",
    status: staff.status ?? "pending",
  };

  Object.entries(staffInfo).forEach(([key, value]) => {
    response.cookies.set(key, value, { path: "/" });
  });

  return response;
}