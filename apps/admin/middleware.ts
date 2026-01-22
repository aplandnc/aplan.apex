import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseAuthCookie(req: NextRequest) {
  // Supabase auth 쿠키 패턴(환경/버전에 따라 이름이 조금 다름)
  // - sb-<project>-auth-token
  // - sb-access-token / sb-refresh-token
  const all = req.cookies.getAll();
  return all.some((c) => {
    const name = c.name.toLowerCase();
    return (
      name.startsWith("sb-") &&
      (name.includes("auth-token") || name.includes("access-token") || name.includes("refresh-token")) &&
      c.value &&
      c.value.length > 10
    );
  });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Next 내부/정적 리소스는 무조건 통과 (여기 안 빼면 sites.json 루프남)
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/img") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts") ||
    /\.[a-zA-Z0-9]+$/.test(pathname) // .css .js .png ...
  ) {
    return NextResponse.next();
  }

  // ✅ 로그인 페이지는 통과
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // ✅ 세션 쿠키 확인 (브라우저 닫으면 자동 삭제되는 쿠키)
  const hasSessionCookie = req.cookies.get("apex-session");
  
  // ✅ Supabase auth 쿠키 확인
  const hasAuthCookie = hasSupabaseAuthCookie(req);

  // ✅ 세션 쿠키가 없으면 로그아웃 처리
  if (!hasSessionCookie && hasAuthCookie) {
    // Supabase 쿠키는 있지만 세션 쿠키가 없음 = 브라우저를 닫았다 다시 열었음
    const response = NextResponse.redirect(new URL("/login", req.url));
    
    // Supabase 쿠키 전부 삭제
    const allCookies = req.cookies.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.toLowerCase().startsWith("sb-")) {
        response.cookies.delete(cookie.name);
      }
    });
    
    return response;
  }

  // ✅ 둘 다 있으면 통과
  if (hasSessionCookie && hasAuthCookie) {
    return NextResponse.next();
  }

  // ❌ 없으면 로그인으로
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // ✅ login만 제외하고 전부 (정적/next는 위에서 먼저 return)
  matcher: ["/((?!login).*)"],
};