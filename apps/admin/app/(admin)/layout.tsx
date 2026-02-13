"use client";

import { useState, useEffect, useMemo, useRef, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseAppClient } from "@apex/config";

interface AdminLayoutProps {
  children: ReactNode;
}

interface AdminInfo {
  name: string;
  code: string;
}

interface CachedAdminInfo extends AdminInfo {
  cachedAt: number;
}

// 캐시 유효 시간 (5분)
const CACHE_TTL_MS = 5 * 60 * 1000;

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Supabase 클라이언트를 useMemo로 캐시
  const supabase = useMemo(() => supabaseAppClient(), []);

  // 이미 갱신 요청을 했는지 추적
  const hasRefreshed = useRef(false);

  const [adminInfo, setAdminInfo] = useState<AdminInfo>({
    name: "admin@aplan",
    code: "A",
  });

  // 코드명 변환 함수
  const getCodeName = (code: string): string => {
    const codeMap: Record<string, string> = {
      A: "Code Alpha",
      B: "Code Bravo",
      C: "Code Charlie",
      O: "Code Oscar",
    };
    return codeMap[code] || code;
  };

  // 캐시 유효성 검사 함수
  const isCacheValid = (cached: CachedAdminInfo | null): cached is CachedAdminInfo => {
    if (!cached?.name || !cached?.code || !cached?.cachedAt) return false;
    return Date.now() - cached.cachedAt < CACHE_TTL_MS;
  };

  // 즉시 로딩: localStorage -> 화면에 바로 뿌리고, 캐시가 만료된 경우만 갱신
  useEffect(() => {
    let cancelled = false;

    // 1) 로컬 캐시 먼저 적용(즉시)
    let cachedData: CachedAdminInfo | null = null;
    try {
      const cached = localStorage.getItem("admin_info");
      if (cached) {
        cachedData = JSON.parse(cached);
        if (cachedData?.name && cachedData?.code && !cancelled) {
          setAdminInfo({ name: cachedData.name, code: cachedData.code });
        }
      }
    } catch {
      // ignore
    }

    // 2) 캐시가 유효하면 갱신 스킵, 만료됐거나 없으면 갱신
    if (isCacheValid(cachedData) || hasRefreshed.current) {
      return;
    }

    hasRefreshed.current = true;

    const refresh = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email || cancelled) return;

      const { data, error } = await supabase
        .from("users_admin")
        .select("name, code")
        .eq("user_id", user.email)
        .single();

      if (!cancelled && data && !error) {
        setAdminInfo(data);
        try {
          const dataWithTimestamp: CachedAdminInfo = {
            ...data,
            cachedAt: Date.now(),
          };
          localStorage.setItem("admin_info", JSON.stringify(dataWithTimestamp));
        } catch {
          // ignore
        }
      }
    };

    refresh();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const menuItems = [
    { type: "single", name: "대시보드", path: "/", icon: "📊" },
    
    { type: "category", label: "현장관리" },
    { type: "item", name: "계약 관리", path: "/attendance", icon: "✒️" },
    { type: "item", name: "지출 관리", path: "/visitors", icon: "💰" },
    { type: "item", name: "데이터 관리", path: "/sales", icon: "💽" },
    
    { type: "category", label: "직원관리" },
    { type: "item", name: "승인 관리", path: "/approval", icon: "✅" },
    { type: "item", name: "직원 관리", path: "/manage_staff", icon: "👥" },
    { type: "item", name: "서류 관리", path: "/documents", icon: "💼" },

    { type: "category", label: "관리자 설정" },
    { type: "item", name: "현장 설정", path: "/sites", icon: "🏢" },
    { type: "item", name: "근무이행각서", path: "/workPledge", icon: "📜" },
    { type: "item", name: "계정 설정", path: "/manage_admin", icon: "🔑" },
  ] as const;

  const handleLogout = async () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      await supabase.auth.signOut();

      // 캐시 및 쿠키 삭제
      try {
        localStorage.removeItem("admin_info");
      } catch {
        // ignore
      }
      document.cookie = "apex-session=; path=/; max-age=0";

      router.push("/login");
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* 사이드바 */}
      <aside className="w-72 bg-white shadow-xl flex flex-col border-r border-gray-200">
        {/* 로고 & 로그인 정보 */}
        <div className="p-4 border-b border-gray-200">
          {/* 로고 */}
          <div className="mb-3">
            <h1 className="text-2xl font-bold text-gray-900">APEX</h1>
            <p className="text-xs text-gray-400">APlan EXecutive System</p>
          </div>

          {/* 로그인 정보 */}
          <div className="bg-blue-50 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-800">{adminInfo.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{getCodeName(adminInfo.code)}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-600 transition"
                title="로그아웃"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 p-3 overflow-y-auto">
          {menuItems.map((item, index) => {
            if (item.type === "single" || item.type === "item") {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={index}
                  href={item.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <span className={item.type === "single" ? "text-xl" : "text-lg"}>{item.icon}</span>
                  <span className="font-medium text-sm">{item.name}</span>
                </Link>
              );
            }

            if (item.type === "category") {
              return (
                <div key={index} className="flex items-center gap-2 px-2 py-2 mt-3 mb-1">
                  <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              );
            }

            return null;
          })}
        </nav>

        {/* 하단 정보 */}
        <div className="p-3 border-t border-gray-200">
          <p className="text-xs text-gray-400">Version 1.0.0</p>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
