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
  
  // 임시 응답 객체 생성 (나중에 실제 리다이렉트 경로로 교체될 수 있음)
  let redirectPath = "/staff";
  const response = NextResponse.redirect(new URL(redirectPath, url.origin));

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

  // 2. 세션 교환 (getUser를 따로 부르지 않고 여기서 유저 정보를 바로 가져옴)
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError || !authData?.user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const user = authData.user;

  // 3. 직원 정보 조회
  const { data: staff, error: staffError } = await supabase
    .from("users_staff")
    .select("kakao_id, site_id, staff_type, name, rank, hq, team, sales_name, status")
    .eq("kakao_id", user.id)
    .maybeSingle();

  // 4. 분기 처리 및 리다이렉트 응답 생성
  if (staffError || !staff) {
    // 등록되지 않은 유저인 경우 /register로 리다이렉트
    const registerResponse = NextResponse.redirect(new URL("/register", url.origin));

    // ✅ 기존 response에 설정된 Supabase 세션 쿠키들을 복사
    response.cookies.getAll().forEach((cookie) => {
      registerResponse.cookies.set(cookie.name, cookie.value, { path: "/" });
    });

    registerResponse.cookies.set("kakao_id", user.id, { path: "/" });
    return registerResponse;
  }

  // 5. 등록된 유저인 경우 쿠키 대량 설정
  const staffInfo: Record<string, string> = {
    kakao_id: staff.kakao_id ?? user.id,
    site_id: staff.site_id ?? "",
    staff_type: staff.staff_type ?? "",
    staff_name: staff.name ?? "",
    rank: staff.rank ?? "",
    hq: staff.hq ?? "",
    team: staff.team ?? "",
    sales_name: staff.sales_name ?? "",
    status: staff.status ?? "pending",
  };

  // 기존 response 객체에 쿠키들 주입
  Object.entries(staffInfo).forEach(([key, value]) => {
    response.cookies.set(key, value, { path: "/" });
  });

  return response;
}