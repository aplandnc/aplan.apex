"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseAppClient } from "@apex/config";

interface Props {
  staffName: string;
  staffType: string;
  rank: string;
  team: string;
  salesName: string;
  canVisitor: boolean;
  canDocs: boolean;
}

export default function Sidebar({
  staffName,
  staffType,
  rank,
  team,
  salesName,
  canVisitor,
  canDocs,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 전역에서 이미 캡처된 프롬프트 확인
    const globalPrompt = (window as any).__pwaInstallPrompt;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
    }

    // 전역 캡처 이벤트 리스너 (늦게 마운트되어도 받을 수 있음)
    const handlePwaReady = () => {
      const prompt = (window as any).__pwaInstallPrompt;
      if (prompt) {
        setDeferredPrompt(prompt);
      }
    };

    // 이후 발생하는 beforeinstallprompt도 캐치
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).__pwaInstallPrompt = e;
    };

    // 이미 설치된 경우 감지
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__pwaInstallPrompt = null;
    };

    // standalone 모드 체크 (이미 PWA로 실행 중)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    window.addEventListener("pwaInstallReady", handlePwaReady);
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("pwaInstallReady", handlePwaReady);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // 네이티브 설치 프롬프트
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // 브라우저별 안내
      const ua = navigator.userAgent;
      if (/iPhone|iPad/i.test(ua)) {
        alert('하단의 공유 버튼(□↑)을 누른 후 "홈 화면에 추가"를 선택하세요.');
      } else if (/Android/i.test(ua)) {
        alert('브라우저 메뉴(⋮)에서 "홈 화면에 추가"를 선택하세요.');
      } else {
        alert('브라우저 주소창의 설치 아이콘을 클릭하거나, 메뉴에서 "앱 설치"를 선택하세요.');
      }
    }
  };

  const handleLogout = async () => {
    const supabase = supabaseAppClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* 헤더 */}
      <header className="sticky top-0 z-[10001] bg-gradient-to-r from-gray-900 via-gray-800 to-red-900 shadow-lg">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setIsOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-white text-2xl rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
            aria-label="메뉴 열기"
          >
            ☰
          </button>

          <h1 className="text-xl font-bold tracking-wider text-white">
            <Link href="/checkin">APLAN 업무시스템</Link>
          </h1>

          <div className="w-10"></div>
        </div>
      </header>

      {/* 사이드바 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[10002] transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* 사이드바 메인 */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-80 bg-white z-[10002] shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* 사이드바 헤더 */}
        <div className="h-28 bg-gradient-to-br from-red-600 to-red-800 px-6 flex items-center text-white relative">
          <div className="flex-1 min-w-0">
            <div className="text-xl font-bold tracking-wide">{staffName || "사용자"}</div>
            <div className="text-red-100 text-sm mt-0.5">
              {staffType} {rank && `| ${rank}`}
            </div>
          </div>

          {/* 로그아웃 버튼 */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-medium transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            로그아웃
          </button>

          <button
            onClick={closeSidebar}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-white text-2xl rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 네비게이션 리스트 */}
        <nav
          className="p-3 pb-24 space-y-1 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 7rem)" }}
        >
          {/* 공지사항 */}
          <Link
            href="/notice"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
            onClick={closeSidebar}
          >
            <span className="text-2xl">📢</span>
            <span className="font-medium">공지사항</span>
          </Link>

          {/* 출퇴근 섹션 */}
          <div className="pt-3 mb-2">
            <div className="flex items-center gap-2 mb-1.5 px-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                출퇴근
              </div>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <Link
              href="/checkin"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
              onClick={closeSidebar}
            >
              <span className="text-2xl">📍</span>
              <span className="font-medium">출근체크</span>
            </Link>
            <Link
              href="/history"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
              onClick={closeSidebar}
            >
              <span className="text-2xl">📊</span>
              <span className="font-medium">내 출근현황</span>
            </Link>
          </div>

          {/* 업무 섹션 */}
          <div className="pt-2 mb-2">
            <div className="flex items-center gap-2 mb-1.5 px-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                업무
              </div>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {canVisitor && (
              <Link
                href="/submitVisitor"
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
                onClick={closeSidebar}
              >
                <span className="text-2xl">👥</span>
                <span className="font-medium">방문예정 등록</span>
              </Link>
            )}

            {canDocs && (
              <>
                <Link
                  href="/submitPledge"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
                  onClick={closeSidebar}
                >
                  <span className="text-2xl">📋</span>
                  <span className="font-medium">근무이행각서</span>
                </Link>
                <Link
                  href="/submitDocs"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
                  onClick={closeSidebar}
                >
                  <span className="text-2xl">📠</span>
                  <span className="font-medium">서류 제출</span>
                </Link>
              </>
            )}

            <Link
              href="/complain"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
              onClick={closeSidebar}
            >
              <span className="text-2xl">📬</span>
              <span className="font-medium">마음의소리</span>
            </Link>
          </div>

          {/* 설정 섹션 */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-1.5 px-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                설정
              </div>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
              onClick={closeSidebar}
            >
              <span className="text-2xl">🪪</span>
              <span className="font-medium">내 정보 보기</span>
            </Link>
          </div>
        </nav>

        {/* 앱 설치 버튼 */}
        {!isInstalled && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100">
            <button
              onClick={handleInstall}
              className="w-full bg-[#146bb7] text-white py-2.5 rounded-lg font-semibold shadow-lg hover:bg-[#1259a0] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-base" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>💾</span>
              <span>앱으로 설치하기</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}