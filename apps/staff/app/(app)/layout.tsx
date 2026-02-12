import Link from "next/link";
import { cookies } from "next/headers";
import { ReactNode } from "react";
import Sidebar from "./sidebar"; // 👇 아래에 클라이언트용 사이드바 분리
import "@apex/ui/styles/globals.css";

export default function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = cookies();

  const staffType = cookieStore.get("staff_type")?.value ?? "";
  const staffName = cookieStore.get("staff_name")?.value ?? "";
  const rank = cookieStore.get("rank")?.value ?? "";
  const team = cookieStore.get("team")?.value ?? "";
  const salesName = cookieStore.get("sales_name")?.value ?? "";

  const canVisitor = staffType === "영업사원";
  const canDocs = ["기획", "상담사", "TM", "영업사원"].includes(staffType);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 z-[10001] bg-gradient-to-r from-gray-900 via-gray-800 to-red-900 shadow-lg">
        <div className="flex items-center justify-between px-4 h-16">
          <Sidebar
            staffName={staffName}
            staffType={staffType}
            rank={rank}
            team={team}
            salesName={salesName}
            canVisitor={canVisitor}
            canDocs={canDocs}
          />
          <h1 className="text-xl font-bold tracking-wider text-white">
            <Link href="/">APLAN 업무시스템</Link>
          </h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="pb-4">
        <div className="h-16" />
        {children}
      </main>
    </div>
  );
}
