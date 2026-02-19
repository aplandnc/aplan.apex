import { cookies } from "next/headers";
import { ReactNode } from "react";
import Sidebar from "./sidebar";
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
    <div className="flex flex-col h-screen h-[100dvh] overflow-hidden bg-gray-50">
      {/* 헤더 + 사이드바 (클라이언트 컴포넌트) */}
      <Sidebar
        staffName={staffName}
        staffType={staffType}
        rank={rank}
        team={team}
        salesName={salesName}
        canVisitor={canVisitor}
        canDocs={canDocs}
      />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 min-h-0 pb-4 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}