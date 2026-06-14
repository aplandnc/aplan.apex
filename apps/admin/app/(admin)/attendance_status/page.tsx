"use client";

import * as React from "react";
import { supabaseAppClient } from "@apex/config";
import AdminPageShell from "@/components/AdminPageShell";
import { adminUi } from "@apex/ui/styles/admin";
import { getTodayKST } from "@apex/utils";

type Site = {
  id: string;
  name: string;
};

type StaffMember = {
  id: string;
  name: string;
  staff_type: string | null;
  hq: string | null;
  team: string | null;
  rank: string | null;
};

type AttendanceRecord = {
  user_id: string;
  work_date: string;
};

export default function AttendanceStatusPage() {
  const supabase = React.useMemo(() => supabaseAppClient(), []);

  const [loading, setLoading] = React.useState(true);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("");
  const [staffList, setStaffList] = React.useState<StaffMember[]>([]);
  const [attendanceRecords, setAttendanceRecords] = React.useState<AttendanceRecord[]>([]);
  const [todayAttendanceByType, setTodayAttendanceByType] = React.useState<Record<string, number>>({});
  const [toast, setToast] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);

  // 월 선택
  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = React.useState(new Date().getMonth() + 1);

  // 토스트 자동 숨김
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // 현장 목록 로드
  React.useEffect(() => {
    async function fetchSites() {
      const { data } = await supabase.from("sites").select("id, name").order("name");
      if (data && data.length > 0) {
        setSites(data);
        setSelectedSiteId(data[0].id);
      }
    }
    fetchSites();
  }, [supabase]);

  // 데이터 로드 (현장 또는 월 변경 시)
  React.useEffect(() => {
    if (!selectedSiteId) return;

    const fetchData = async () => {
      setLoading(true);

      const daysInMonth = getDaysInMonth(currentYear, currentMonth);
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      const today = getTodayKST();

      // 직원 목록 조회 (승인된 직원만)
      const { data: staffData } = await supabase
        .from("users_staff")
        .select("id, name, staff_type, hq, team, rank")
        .eq("site_id", selectedSiteId)
        .eq("status", "approved")
        .order("hq")
        .order("team")
        .order("name");

      // 출근 기록 조회
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("user_id, work_date")
        .eq("site_id", selectedSiteId)
        .gte("work_date", startDate)
        .lte("work_date", endDate);

      const staff = (staffData ?? []) as StaffMember[];
      const attendance = (attendanceData ?? []) as AttendanceRecord[];

      setStaffList(staff);
      setAttendanceRecords(attendance);

      // 오늘 출근 수 계산 (직무구분별)
      const todayAttendance = attendance.filter((a) => a.work_date === today);
      const byType: Record<string, number> = {};
      todayAttendance.forEach((a) => {
        const staffMember = staff.find((s) => s.id === a.user_id);
        const type = staffMember?.staff_type || "기타";
        byType[type] = (byType[type] || 0) + 1;
      });
      setTodayAttendanceByType(byType);

      setLoading(false);
    };

    fetchData();
  }, [selectedSiteId, currentYear, currentMonth, supabase]);

  // 특정 직원이 특정 날짜에 출근했는지 확인
  const hasAttendance = (staffId: string, day: number): boolean => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return attendanceRecords.some((r) => r.user_id === staffId && r.work_date === dateStr);
  };

  // 출근 토글 (클릭 시 추가/삭제)
  const toggleAttendance = async (staff: StaffMember, day: number) => {
    if (processing) return;
    setProcessing(true);

    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const exists = hasAttendance(staff.id, day);

    try {
      if (exists) {
        // 삭제
        const { error } = await supabase
          .from("attendance")
          .delete()
          .eq("user_id", staff.id)
          .eq("site_id", selectedSiteId)
          .eq("work_date", dateStr);

        if (error) throw error;

        setAttendanceRecords((prev) =>
          prev.filter((r) => !(r.user_id === staff.id && r.work_date === dateStr))
        );
        setToast(`${staff.name} ${currentMonth}/${day} 출근 삭제`);
      } else {
        // 추가
        const { error } = await supabase.from("attendance").insert({
          user_id: staff.id,
          site_id: selectedSiteId,
          work_date: dateStr,
        });

        if (error) throw error;

        setAttendanceRecords((prev) => [...prev, { user_id: staff.id, work_date: dateStr }]);
        setToast(`${staff.name} ${currentMonth}/${day} 출근 추가`);
      }

      // 오늘 출근 수 업데이트 (직무구분별)
      const today = getTodayKST();
      if (dateStr === today) {
        const type = staff.staff_type || "기타";
        setTodayAttendanceByType((prev) => ({
          ...prev,
          [type]: Math.max(0, (prev[type] || 0) + (exists ? -1 : 1)),
        }));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "처리 실패";
      console.error("[attendance] 토글 실패:", message);
      setToast(`오류: ${message}`);
    } finally {
      setProcessing(false);
    }
  };

  // 직원별 출근 일수 계산
  const getAttendanceCount = (staffId: string): number => {
    return attendanceRecords.filter((r) => r.user_id === staffId).length;
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <AdminPageShell
      title="출근현황"
      description="현장별 직원 출근 현황 (셀 클릭으로 출근 추가/삭제)"
      actions={
        <button
          className={adminUi.buttonClass.secondary}
          onClick={() => {
            setCurrentYear(new Date().getFullYear());
            setCurrentMonth(new Date().getMonth() + 1);
          }}
          type="button"
        >
          이번 달
        </button>
      }
    >
      {/* 토스트 */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-blue-600 px-4 py-3 text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* 현장 선택 */}
      <div className={`${adminUi.card} mb-6`}>
        <h2 className="mb-3 text-sm font-medium text-gray-700">현장 선택</h2>
        <div className="grid grid-cols-5 gap-3">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                selectedSiteId === site.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {/* 월 선택 (가운데 정렬) */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={handlePrevMonth}
          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        >
          ◀
        </button>
        <div className="text-lg font-bold text-gray-900 min-w-[140px] text-center">
          {currentYear}년 {currentMonth}월
        </div>
        <button
          onClick={handleNextMonth}
          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
        >
          ▶
        </button>
      </div>

      {/* 오늘 출근 카드 (직무구분별) */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 rounded-xl shadow mb-6">
        <div className="text-sm opacity-90 mb-2">오늘 출근</div>
        <div className="flex items-center gap-6 flex-wrap">
          {Object.keys(todayAttendanceByType).length === 0 ? (
            <div className="text-xl font-bold">0명</div>
          ) : (
            <>
              {Object.entries(todayAttendanceByType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-sm opacity-80">{type}</span>
                  <span className="text-xl font-bold">{count}명</span>
                </div>
              ))}
              <div className="border-l border-white/30 pl-4 ml-2">
                <span className="text-sm opacity-80">총</span>
                <span className="text-xl font-bold ml-2">
                  {Object.values(todayAttendanceByType).reduce((a, b) => a + b, 0)}명
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 출근 현황 테이블 */}
      <div className={adminUi.card}>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">로딩 중...</div>
        ) : staffList.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">등록된 직원이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="sticky left-0 z-10 bg-gray-50 px-2 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[60px]">
                    직무
                  </th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-700 min-w-[60px]">
                    본부
                  </th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-700 min-w-[60px]">
                    팀
                  </th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-700 min-w-[70px]">
                    성명
                  </th>
                  <th className="px-2 py-3 text-center font-semibold text-gray-700 border-r border-gray-200 min-w-[60px]">
                    직급
                  </th>
                  {days.map((day) => (
                    <th
                      key={day}
                      className="px-1 py-3 text-center font-medium text-gray-600 min-w-[32px]"
                    >
                      {day}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-semibold text-gray-700 border-l border-gray-200 min-w-[50px]">
                    합계
                  </th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, index) => (
                  <tr
                    key={staff.id}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                  >
                    <td className="sticky left-0 z-10 bg-inherit px-2 py-2 text-center border-r border-gray-200">
                      <span className="text-xs text-blue-600 font-medium">{staff.staff_type ?? "-"}</span>
                    </td>
                    <td className="px-2 py-2 text-center text-sm text-gray-700">{staff.hq ?? "-"}</td>
                    <td className="px-2 py-2 text-center text-sm text-gray-700">{staff.team ?? "-"}</td>
                    <td className="px-2 py-2 text-center font-medium text-gray-900">{staff.name}</td>
                    <td className="px-2 py-2 text-center text-sm text-gray-700 border-r border-gray-200">{staff.rank ?? "-"}</td>
                    {days.map((day) => {
                      const attended = hasAttendance(staff.id, day);
                      return (
                        <td
                          key={day}
                          onClick={() => toggleAttendance(staff, day)}
                          className={`px-1 py-2 text-center cursor-pointer transition-colors hover:bg-blue-50 ${
                            processing ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          {attended ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-gray-300 hover:text-blue-400">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold text-blue-600 border-l border-gray-200">
                      {getAttendanceCount(staff.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}
