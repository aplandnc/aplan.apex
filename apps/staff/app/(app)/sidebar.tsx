"use client";

import Link from "next/link";
import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  // 메뉴 클릭 시 사이드바를 닫아주는 함수
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 flex items-center justify-center text-white text-2xl rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
      >
        ☰
      </button>

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
        {/* 사이드바 헤더 - 사용자 정보 반영 */}
        <div className="h-28 bg-gradient-to-br from-red-600 to-red-800 px-6 flex flex-col justify-center text-white relative">
          <div>
            <div className="text-xl font-bold tracking-wide">{staffName || "사용자"}</div>
            <div className="text-red-100 text-sm mt-0.5">
              {staffType} {rank && `| ${rank}`}
            </div>
          </div>
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

          {/* 업무 섹션 - 권한 로직 적용 */}
          {(canVisitor || canDocs) && (
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
                    href="/staff/agreement"
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
                    <span className="text-2xl">🪪</span>
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
          )}

          {/* 설정 섹션 */}
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-1.5 px-3">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                설정
              </div>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>
            <Link
              href="/editProfile"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all active:scale-95"
              onClick={closeSidebar}
            >
              <span className="text-2xl">⚙️</span>
              <span className="font-medium">내 정보 수정</span>
            </Link>
          </div>
        </nav>

        {/* 앱 설치 버튼 - 하단 고정 복구 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-100">
          <button
            onClick={() => {
              alert('홈 화면에 추가하려면 브라우저 메뉴에서 "홈 화면에 추가"를 선택하세요.');
            }}
            className="w-full bg-[#146bb7] text-white py-2.5 rounded-lg font-semibold shadow-lg hover:bg-[#1f1f1f] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-base">💾</span>
            <span>앱으로 설치하기</span>
          </button>
        </div>
      </aside>
    </>
  );
}