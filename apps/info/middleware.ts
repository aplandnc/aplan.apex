import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Next 내부/정적 리소스는 무조건 통과
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/img") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 로그인 페이지는 통과
  if (pathname === "/") {
    return NextResponse.next();
  }

  // API 경로는 통과 (API 라우트에서 자체 인증 처리)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // 세션 쿠키 확인
  const hasSessionCookie = req.cookies.get("apex-session");

  // 세션 쿠키가 있으면 통과
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  // 없으면 로그인으로
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|robots.txt|sitemap.xml|img|images|icons|fonts|api).*)"],
};
