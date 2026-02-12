import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * ✅ 로그인 없이 허용할 경로들
 */
function isPublicPath(pathname: string) {
  // Next 내부/정적
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname === "/robots.txt") return true;
  if (pathname === "/sitemap.xml") return true;

  // ✅ Next 내부 not-found 렌더링 경로(페이지 만들 필요 없음)
  if (pathname === "/not-found") return true;

  // public 정적 리소스
  if (pathname.startsWith("/img/")) return true;
  if (pathname.startsWith("/assets/")) return true;

  // 앱에서 로그인 없이 허용할 페이지
  if (pathname === "/login") return true;
  if (pathname === "/register") return true;
  if (pathname.startsWith("/auth/callback")) return true;

  // trailing slash 대응
  if (pathname.endsWith("/")) {
    const p = pathname.slice(0, -1);
    if (p === "/login" || p === "/register" || p.startsWith("/auth/callback")) return true;
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1) 예외 경로는 그대로 통과
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 2) response 객체 생성
  const res = NextResponse.next();

  // 3) Supabase 클라이언트
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          res.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // 4) ✅ 세션 스토리지 값(getSession) 대신 서버 검증(getUser)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 5) 로그인 안 돼 있으면 /login으로
  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6) users_staff 데이터 확인
  const { data: userData } = await supabase
    .from("users_staff")
    .select("status")
    .eq("kakao_id", user.id)
    .single();

  // 7) 미가입자 → /register
  if (!userData) {
    return NextResponse.redirect(new URL("/register", req.url));
  }

  // 8) status 기준 분기
  if (userData.status === "rejected" || userData.status === "pending") {
    // 반려 또는 대기중 → /register (register에 pending/rejected 로직 있음)
    return NextResponse.redirect(new URL("/register", req.url));
  }

  if (userData.status !== "approved") {
    // 기타 미승인 상태도 → /register
    return NextResponse.redirect(new URL("/register", req.url));
  }

  // 9) 승인 완료 → 루트 접근 시 /staff로 리다이렉트
  if (pathname === "/" || pathname === "") {
    return NextResponse.redirect(new URL("/staff", req.url));
  }

  // 10) 그 외 경로는 통과
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|logo.svg).*)"],
};
