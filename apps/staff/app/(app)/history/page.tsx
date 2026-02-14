"use client";

import { useEffect, useState } from "react";
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";

interface AttendanceRecord {
  work_date: string;
  created_at: string;
}

export default function AttendanceHistoryPage() {
  const supabase = supabaseAppClient();

  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState<string>("");
  const [staffId, setStaffId] = useState<string | null>(null); // users_staff.id (PK)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [errorMsg, setErrorMsg] = useState("");

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

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  // 초기 데이터 로드 (staff 정보 + 현재 월 출근 기록 병렬 로드)
  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMsg("로그인이 필요합니다.");
          setLoading(false);
          return;
        }

        const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
          getDaysInMonth(currentYear, currentMonth)
        ).padStart(2, "0")}`;

        // staff 정보 먼저 조회
        const staffResult = await supabase
          .from("users_staff")
          .select("id, name, site_id")
          .eq("kakao_id", user.id)
          .single();

        if (staffResult.error || !staffResult.data) {
          setErrorMsg("직원 정보를 불러올 수 없습니다.");
          setLoading(false);
          return;
        }

        // staffId 캐시
        setStaffId(staffResult.data.id);
        setStaffName(staffResult.data.name);

        // 출근 기록 조회 (staff.id 사용)
        const attendanceResult = await supabase
          .from("attendance")
          .select("work_date, created_at")
          .eq("user_id", staffResult.data.id)
          .gte("work_date", startDate)
          .lte("work_date", endDate)
          .order("work_date", { ascending: true });

        setAttendanceRecords(attendanceResult.data || []);
        setLoading(false);
      } catch (error) {
        console.error("데이터 로드 오류:", error);
        setErrorMsg("데이터를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 달력 네비게이션 시 출근 기록만 다시 로드 (캐시된 staffId 사용)
  useEffect(() => {
    const loadAttendanceRecords = async () => {
      if (!staffId) return;

      try {
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
          getDaysInMonth(currentYear, currentMonth)
        ).padStart(2, "0")}`;

        const { data, error } = await supabase
          .from("attendance")
          .select("work_date, created_at")
          .eq("user_id", staffId)
          .gte("work_date", startDate)
          .lte("work_date", endDate)
          .order("work_date", { ascending: true });

        if (error) {
          console.error("출근 기록 로드 오류:", error);
          return;
        }

        setAttendanceRecords(data || []);
      } catch (error) {
        console.error("출근 기록 로드 중 오류:", error);
      }
    };

    // 초기 로드가 아닌 경우에만 실행 (달력 네비게이션)
    if (staffId && !loading) {
      loadAttendanceRecords();
    }
  }, [currentYear, currentMonth, staffId]);

  const hasAttendance = (day: number): boolean => {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
    return attendanceRecords.some((record) => record.work_date === dateStr);
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      today.getFullYear() === currentYear &&
      today.getMonth() + 1 === currentMonth &&
      today.getDate() === day
    );
  };

  const calendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  if (loading) {
    return (
      <div className={`${staffUi.layout.page} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-gray-600">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={`${staffUi.layout.page} flex items-center justify-center p-4`}>
        <div className={staffUi.alert.warning}>
          <div className={staffUi.alert.warningTitle}>오류</div>
          <div className={staffUi.alert.warningText}>{errorMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={staffUi.layout.page}>
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-4">
        {/* 상단 제목 카드 */}
        <div className={`${staffUi.card} p-2 text-center`}>
          <div className="text-[18px] font-extrabold text-gray-900 leading-snug">
            {staffName}님의 출근기록 현황
          </div>
        </div>

        {/* 월 선택 카드 */}
        <div className="rounded-lg bg-white shadow px-4 py-2.5">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ◀
            </button>
            <div className="text-lg font-bold text-gray-900">
              {currentYear}년 {currentMonth}월
            </div>
            <button
              onClick={handleNextMonth}
              className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ▶
            </button>
          </div>
        </div>

        {/* 달력 */}
        <div className="rounded-lg bg-white shadow p-4">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
              <div
                key={day}
                className={`text-center text-xs font-semibold py-2 ${
                  index === 0 ? "text-red-600" : index === 6 ? "text-blue-600" : "text-gray-700"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 구분선 */}
          <div className="border-t border-gray-200 mb-3"></div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays().map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="h-16" />;
              }

              const attended = hasAttendance(day);
              const today = isToday(day);
              const dayOfWeek = index % 7;

              return (
                <div
                  key={day}
                  className={`
                    h-16 flex items-start justify-between p-1.5 rounded-lg relative
                    ${today ? "bg-blue-100 border-2 border-blue-500" : ""}
                    ${attended && !today ? "bg-green-50" : ""}
                    ${!attended && !today ? "bg-gray-50" : ""}
                  `}
                >
                  {/* 날짜 - 왼쪽 위 */}
                  <div
                    className={`text-xs font-semibold ${
                      dayOfWeek === 0
                        ? "text-red-600"
                        : dayOfWeek === 6
                        ? "text-blue-600"
                        : "text-gray-700"
                    }`}
                  >
                    {day}
                  </div>
                  
                  {/* 체크마크 - 중앙 */}
                  {attended && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-green-600 text-2xl font-bold">✓</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center text-sm text-gray-600">
          💕 귀하의 노고에 감사드립니다 💕
        </div>


      </div>
    </div>
  );
}