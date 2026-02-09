"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAppClient } from "@apex/config";
import { useNaverMaps } from "./useNaverMaps";
import { staffUi } from "@apex/ui/styles/staff";

// 네이버 지도 타입 선언
declare global {
  interface Window {
    naver: any;
  }
}

interface SiteInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  checkin_radius_m: number;
  checkin_start_time: string;
  checkin_end_time: string;
}

interface AttendanceStatus {
  hasCheckedIn: boolean;
  checkInTime?: string;
}

export default function AttendanceCheckPage() {
  const supabase = supabaseAppClient();

  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({ hasCheckedIn: false });
  const { loaded: mapLoaded, error: mapError } = useNaverMaps();
  const [errorMsg, setErrorMsg] = useState("");

  // 거리 계산 (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 현재 시각이 출근 가능 시간인지 체크
  const isWithinWorkHours = (startTime: string, endTime: string): boolean => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
      2,
      "0"
    )}`;
    return currentTime >= startTime && currentTime <= endTime;
  };

  const getNowHHMM = (): string => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  };

  // 시간 형식을 HH:MM만 표시 (초 제거)
  const formatTimeHHMM = (time?: string): string => {
    if (!time) return "";
    return time.substring(0, 5); // "09:00:00" -> "09:00"
  };

  // 오늘 날짜 (KST 기준)
  const getTodayKST = (): string => {
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    return kstTime.toISOString().split("T")[0];
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. 현재 유저 정보
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMsg("로그인이 필요합니다.");
          setLoading(false);
          return;
        }

        // 2. 유저의 site_id + 직원명 가져오기
        const { data: staffData, error: staffError } = await supabase
          .from("users_staff")
          .select("site_id, name")
          .eq("kakao_id", user.id)
          .single();

        if (staffError || !staffData) {
          setErrorMsg("소속 현장이 없습니다.");
          setLoading(false);
          return;
        }

        setStaffName(staffData?.name ?? "");

        // 3. 현장 정보 가져오기
        const { data: siteData, error: siteError } = await supabase
          .from("sites")
          .select("*")
          .eq("id", staffData.site_id)
          .single();

        if (siteError || !siteData) {
          setErrorMsg("현장 정보를 불러올 수 없습니다.");
          setLoading(false);
          return;
        }

        setSite(siteData);

        // 4. 오늘 출근 기록 확인
        const today = getTodayKST();
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("created_at")
          .eq("user_id", user.id)
          .eq("site_id", staffData.site_id)
          .eq("work_date", today)
          .maybeSingle();

        if (attendanceData) {
          setAttendanceStatus({
            hasCheckedIn: true,
            checkInTime: new Date(attendanceData.created_at).toLocaleTimeString("ko-KR"),
          });
        }

        setLoading(false);
      } catch (error) {
        console.error("데이터 로드 오류:", error);
        setErrorMsg("데이터를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // GPS 위치 가져오기
  useEffect(() => {
    if (!site) return;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentPosition(pos);

          const dist = calculateDistance(pos.lat, pos.lng, site.lat, site.lng);
          setDistance(dist);
          setGpsLoading(false);
        },
        (error) => {
          console.error("GPS 오류:", error);
          setErrorMsg("위치 정보를 가져올 수 없습니다. GPS를 켜주세요.");
          setGpsLoading(false);
        }
      );
    } else {
      setErrorMsg("이 기기는 GPS를 지원하지 않습니다.");
      setGpsLoading(false);
    }
  }, [site]);

  // 지도 그리기
  useEffect(() => {
    if (!mapLoaded || !site || !currentPosition) return;
    if (typeof window.naver === "undefined") return;

    const initMap = () => {
      const mapDiv = document.getElementById("map");
      if (!mapDiv) return;

      const map = new window.naver.maps.Map(mapDiv, {
        center: new window.naver.maps.LatLng(site.lat, site.lng),
        zoom: 17,
        zIndex: 1,
      });

      // 현장 마커
      new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(site.lat, site.lng),
        map: map,
        title: site.name,
        icon: {
          content:
            '<div style="background: #2563eb; color: white; padding: 6px 10px; border-radius: 999px; font-weight: 700; font-size: 12px;">📍 현장</div>',
          anchor: new window.naver.maps.Point(30, 30),
        },
      });

      // 반경 원
      new window.naver.maps.Circle({
        map: map,
        center: new window.naver.maps.LatLng(site.lat, site.lng),
        radius: site.checkin_radius_m,
        fillColor: "#2563eb",
        fillOpacity: 0.08,
        strokeColor: "#2563eb",
        strokeOpacity: 0.5,
        strokeWeight: 2,
      });

      // 내 위치 마커
      const isInRange = distance !== null && distance <= site.checkin_radius_m;
      new window.naver.maps.Marker({
        position: new window.naver.maps.LatLng(currentPosition.lat, currentPosition.lng),
        map: map,
        icon: {
          content: `<div style="background: ${
            isInRange ? "#10b981" : "#6b7280"
          }; color: white; padding: 6px 10px; border-radius: 999px; font-weight: 700; font-size: 12px;">${
            isInRange ? "✅" : "📍"
          } 내 위치</div>`,
          anchor: new window.naver.maps.Point(30, 30),
        },
      });
    };

    const timer = setTimeout(initMap, 100);
    return () => clearTimeout(timer);
  }, [mapLoaded, site, currentPosition, distance]);

  // 출근 체크 실행
  const handleCheckIn = async () => {
    if (!site || !currentPosition) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = getTodayKST();

      const { error } = await supabase.from("attendance").insert({
        site_id: site.id,
        user_id: user.id,
        work_date: today,
      });

      if (error) {
        alert("출근 체크 실패: " + error.message);
        return;
      }

      alert("출근 체크 완료!");
      setAttendanceStatus({
        hasCheckedIn: true,
        checkInTime: new Date().toLocaleTimeString("ko-KR"),
      });
    } catch (error) {
      console.error("출근 체크 오류:", error);
      alert("출근 체크 중 오류가 발생했습니다.");
    }
  };

  // 상태 계산
  const inRange = useMemo(() => {
    if (!site || distance === null) return false;
    return distance <= site.checkin_radius_m;
  }, [site, distance]);

  const inTime = useMemo(() => {
    if (!site) return false;
    return isWithinWorkHours(site.checkin_start_time, site.checkin_end_time);
  }, [site]);

  const canCheckIn = () => {
    if (attendanceStatus.hasCheckedIn) return false;
    if (distance === null || !site) return false;
    if (!inRange) return false;
    if (!inTime) return false;
    return true;
  };

  const statusLine = useMemo(() => {
    if (attendanceStatus.hasCheckedIn) return { tone: "ok", text: "✅ 오늘 출근 완료" as const };
    if (gpsLoading) return { tone: "muted", text: "🌍 위치 확인 중..." as const };
    if (mapError) return { tone: "bad", text: "❌ 지도 로드 실패(인증 오류)" as const };
    if (distance === null || !site) return { tone: "muted", text: "정보를 불러오는 중..." as const };

    if (!inRange) return { tone: "bad", text: "출근 체크 불가 : 반경 밖에 있습니다." as const };
    if (!inTime) return { tone: "bad", text: "출근 체크 불가 : 출근 가능 시간이 아닙니다." as const };
    return { tone: "ok", text: "출근 체크가 가능합니다." as const };
  }, [attendanceStatus.hasCheckedIn, gpsLoading, mapError, distance, site, inRange, inTime]);

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
      {/* 모바일 한 화면 목표: max-w + 간격 최소화 */}
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-3">
        {/* 상단 카드 (중앙정렬) */}
        <div className={`${staffUi.card} p-4 text-center`}>
          <div className="text-[18px] font-extrabold text-gray-900 leading-snug">{site?.name}</div>
          <div className="mt-1 text-sm text-gray-700">
            <span className="font-semibold">{staffName ? staffName : "직원"}</span>님, 안녕하세요! 😊
          </div>
        </div>

        {/* 출근가능시간/현재시간 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white shadow px-3 py-3">
            <div className="text-[11px] text-gray-500">출근 가능 시간</div>
            <div className="mt-1 text-sm font-bold text-gray-900">
              {formatTimeHHMM(site?.checkin_start_time)} ~ {formatTimeHHMM(site?.checkin_end_time)}
            </div>
          </div>
          <div className="rounded-lg bg-white shadow px-3 py-3">
            <div className="text-[11px] text-gray-500">현재 시간</div>
            <div className="mt-1 text-sm font-bold text-gray-900">{getNowHHMM()}</div>
          </div>
        </div>

        {/* 현재 상태 메시지 */}
        <div className="rounded-lg bg-white shadow px-4 py-3 text-center">
          <div
            className={[
              "text-sm font-bold",
              statusLine.tone === "ok" ? "text-green-700" : statusLine.tone === "bad" ? "text-red-600" : "text-gray-500",
            ].join(" ")}
          >
            {statusLine.text}
          </div>
        </div>

        {/* 지도 */}
        {gpsLoading ? (
          <div className="rounded-lg bg-gray-100 h-52 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-1">🌍</div>
              <div className="text-gray-600 text-sm">위치 확인 중...</div>
            </div>
          </div>
        ) : mapError ? (
          <div className="rounded-lg bg-red-50 border border-red-200 h-52 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-1">❌</div>
              <div className="text-red-600 font-semibold text-sm">지도 로드 실패</div>
              <div className="text-red-500 text-xs mt-1">네이버 지도 인증 오류</div>
            </div>
          </div>
        ) : (
          <div id="map" className="w-full h-52 rounded-lg shadow" />
        )}

        {/* 버튼 / 완료 카드 (지도 아래) */}
        {attendanceStatus.hasCheckedIn ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-green-800 font-extrabold">오늘 출근 완료</div>
            <div className="text-green-700 text-xs mt-1">출근 시각: {attendanceStatus.checkInTime}</div>
          </div>
        ) : (
          <button onClick={handleCheckIn} disabled={!canCheckIn()} className={staffUi.buttonClass.primary}>
            {canCheckIn() ? "🏢 출근 체크하기" : "출근 불가"}
          </button>
        )}
      </div>
    </div>
  );
}