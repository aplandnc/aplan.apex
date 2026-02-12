import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const cookieStore = cookies();

  // 기본은 staff로 보내되, 아래에서 조건에 따라 바꿈
  let redirectPath = "/staff";

  // response는 redirectPath 확정 후에 만들어야 함 (쿠키 set이 여기 붙음)
  const makeResponse = (path: string) =>
    NextResponse.redirect(new URL(path, url.origin));

  // 우선 임시 response
  let response = makeResponse(redirectPath);

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

  // 1) 세션 생성
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  // 2) 로그인 유저
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  const kakaoId = user.id;

  // 3) 직원 조회
  const { data: staff, error: staffError } = await supabase
    .from("users_staff")
    .select(
      "kakao_id, site_id, staff_type, name, rank, hq, team, sales_name, status"
    )
    .eq("kakao_id", kakaoId)
    .maybeSingle(); // ✅ 없으면 null로 받기

  // 3-A) 직원 row 없음 → register
  if (staffError || !staff) {
    redirectPath = "/register";
    response = makeResponse(redirectPath);

    // kakao_id 정도는 박아두면 register에서 자동 매칭/표시 가능
    response.cookies.set("kakao_id", kakaoId, { path: "/" });
    return response;
  }

  // 3-B) 직원 row 있음 → status 상관없이 쿠키는 박는다
  response.cookies.set("kakao_id", staff.kakao_id ?? kakaoId, { path: "/" });
  response.cookies.set("site_id", staff.site_id ?? "", { path: "/" });
  response.cookies.set("staff_type", staff.staff_type ?? "", { path: "/" });
  response.cookies.set("staff_name", staff.name ?? "", { path: "/" });
  response.cookies.set("rank", staff.rank ?? "", { path: "/" });
  response.cookies.set("hq", staff.hq ?? "", { path: "/" });
  response.cookies.set("team", staff.team ?? "", { path: "/" });
  response.cookies.set("sales_name", staff.sales_name ?? "", { path: "/" });
  response.cookies.set("status", staff.status ?? "pending", { path: "/" }); // ✅ pending 판단용

  // 4) 리다이렉트 결정
  // pending이어도 /staff로 보내되, /staff에서 "승인대기중" 띄우면 됨
  redirectPath = "/staff";

  // redirectPath로 response 다시 생성 (쿠키는 위에서 이미 response에 set 됨)
  // 주의: response를 새로 만들면 쿠키가 날아갈 수 있으니,
  // 여기서는 response를 교체하지 않고 최초부터 /staff로 뒀기 때문에 그대로 반환.
  return response;
}
