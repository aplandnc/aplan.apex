// C:\APLAN\develop\apex\apps\staff\app\(auth)\auth\callback\route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // 1. 인가 코드 확인 로그
  console.log("--- [인증 시작] ---");
  console.log("URL:", url.toString());

  if (!code) {
    console.error("❌ 인가 코드가 URL에 없습니다.");
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL("/staff", url.origin));

  // 2. 새로운 슈퍼베이스 클라이언트 생성 (SSR 0.8.0 API)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 3. 세션 교환 시도 (400 에러 발생 지점)
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError) {
    // 💡 여기서 출력되는 메시지가 400 에러의 진짜 이유입니다.
    console.error("❌ 세션 교환 실패 상세 정보:", {
      message: authError.message,
      status: authError.status,
      code: authError.name
    });
    return NextResponse.redirect(new URL(`/login?msg=${encodeURIComponent(authError.message)}`, url.origin));
  }

  const user = authData.user;
  console.log("✅ 슈퍼베이스 세션 생성 완료 (유저 ID):", user?.id);

  // 4. 직원 정보 조회
  const { data: staff, error: staffError } = await supabase
    .from("users_staff")
    .select("*")
    .eq("kakao_id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    console.log("❓ 직원 테이블에 없는 유저입니다. 가입 페이지로 이동합니다.");
    const registerResponse = NextResponse.redirect(new URL("/register", url.origin));
    
    // 세션 쿠키 이식
    response.cookies.getAll().forEach((c) => {
      registerResponse.cookies.set(c.name, c.value, { path: "/" });
    });
    registerResponse.cookies.set("kakao_id", user.id, { path: "/" });
    return registerResponse;
  }

  // 5. 로그인 성공 및 쿠키 설정
  console.log("🎉 로그인 성공! 직원명:", staff.name);
  
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

  // 보안 쿠키 옵션 설정
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOptions = {
    path: "/",
    httpOnly: false, // 클라이언트에서 읽어야 하는 정보는 false
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7일
  };

  // 민감 정보는 httpOnly로 설정
  const sensitiveCookieOptions = {
    ...cookieOptions,
    httpOnly: true,
  };

  // 민감 정보 (httpOnly)
  response.cookies.set("kakao_id", staffInfo.kakao_id, sensitiveCookieOptions);
  response.cookies.set("site_id", staffInfo.site_id, sensitiveCookieOptions);
  response.cookies.set("status", staffInfo.status, sensitiveCookieOptions);

  // UI 표시용 정보 (클라이언트 접근 필요)
  response.cookies.set("staff_type", staffInfo.staff_type, cookieOptions);
  response.cookies.set("staff_name", staffInfo.staff_name, cookieOptions);
  response.cookies.set("rank", staffInfo.rank, cookieOptions);
  response.cookies.set("hq", staffInfo.hq, cookieOptions);
  response.cookies.set("team", staffInfo.team, cookieOptions);
  response.cookies.set("sales_name", staffInfo.sales_name, cookieOptions);

  console.log("--- [인증 종료] ---");
  return response;
}