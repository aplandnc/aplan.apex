"use client";

import Link from "next/link";
import { useState } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg text-xl"
          >
            ☰
          </button>
          <h1 className="text-lg font-bold">APEX Staff</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* 사이드바 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <div className="text-lg font-bold">STAFF</div>
            <div className="text-xs text-gray-500">APEX Staff App</div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg text-xl"
          >
            ✕
          </button>
        </div>

        <nav className="p-4 space-y-1">
          <Link
            href="/staff/attendance/check"
            className="block rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            출근체크
          </Link>
          <Link
            href="/staff/attendance/history"
            className="block rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            내 출근현황
          </Link>
          <Link
            href="/staff/agreement"
            className="block rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            근무이행각서
          </Link>
          <Link
            href="/staff/documents"
            className="block rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            서류 제출
          </Link>
          <Link
            href="/staff/visitor"
            className="block rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            방문예정 등록
          </Link>

          <div className="border-t my-2"></div>

          <Link
            href="/staff/profile"
            className="block rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            내정보 수정
          </Link>
          
          <button
            onClick={() => {
              alert('홈 화면에 추가하려면 브라우저 메뉴에서 "홈 화면에 추가"를 선택하세요.');
            }}
            className="w-full text-left rounded-lg px-4 py-3 text-sm hover:bg-gray-100"
          >
            앱으로 설치
          </button>
        </nav>
      </aside>

      {/* 메인 컨텐츠 */}
      <main className="p-4">
        {children}
      </main>
    </div>
  );
}