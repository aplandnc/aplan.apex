"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAppClient } from "@apex/config";
import { getTodayKST, calculateDistance, formatTimeHHMM } from "@apex/utils";
import { useNaverMaps } from "./useNaverMaps";
import { staffUi } from "@apex/ui/styles/staff";

// 네이버 지도 타입 정의
interface NaverMaps {
  maps: {
    Map: new (element: HTMLElement, options: { center: NaverLatLng; zoom: number; zIndex?: number }) => NaverMap;
    LatLng: new (lat: number, lng: number) => NaverLatLng;
    Marker: new (options: { position: NaverLatLng; map: NaverMap; title?: string; icon?: { content: string; anchor: NaverPoint } }) => void;
    Circle: new (options: {
      map: NaverMap;
      center: NaverLatLng;
      radius: number;
      fillColor: string;
      fillOpacity: number;
      strokeColor: string;
      strokeOpacity: number;
      strokeWeight: number;
    }) => void;
    Point: new (x: number, y: number) => NaverPoint;
  };
}

interface NaverLatLng {
  lat(): number;
  lng(): number;
}

interface NaverPoint {
  x: number;
  y: number;
}

interface NaverMap {
  setCenter(latlng: NaverLatLng): void;
  setZoom(level: number): void;
}

declare global {
  interface Window {
    naver: NaverMaps;
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
  // Supabase 클라이언트를 컴포넌트 내부에서 생성 (Hot Reload 대응)
  const supabase = useMemo(() => supabaseAppClient(), []);

  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [staffName, setStaffName] = useState<string>("");
  const [staffId, setStaffId] = useState<string>("");
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({ hasCheckedIn: false });
  const { loaded: mapLoaded, error: mapError } = useNaverMaps();
  const [errorMsg, setErrorMsg] = useState("");

  // 1분마다 갱신되는 현재시각
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const currentHHMM = useMemo(() => {
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, [now]);

  const inTime = useMemo(() => {
    if (!site) return false;
    return currentHHMM >= site.checkin_start_time.substring(0, 5) && currentHHMM <= site.checkin_end_time.substring(0, 5);
  }, [site, currentHHMM]);

  // 초기 데이터 로드 + GPS 병렬
  useEffect(() => {
    let isMounted = true;
    let siteDataForGps: SiteInfo | null = null;

    const gpsPromise = new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!("geolocation" in navigator)) {
        if (isMounted) {
          setErrorMsg("이 기기는 GPS를 지원하지 않습니다.");
          setGpsLoading(false);
        }
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          if (isMounted) setCurrentPosition(pos);
          resolve(pos);
        },
        (error) => {
          console.error("GPS 오류:", error);
          if (isMounted) {
            setErrorMsg("위치 정보를 가져올 수 없습니다. GPS를 켜주세요.");
            setGpsLoading(false);
          }
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    });

    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setErrorMsg("로그인이 필요합니다.");
            setLoading(false);
          }
          return;
        }

        const { data: staffData, error: staffError } = await supabase
          .from("users_staff")
          .select("id, site_id, name")
          .eq("kakao_id", user.id)
          .single();

        if (staffError || !staffData) {
          if (isMounted) {
            setErrorMsg("소속 현장이 없습니다.");
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setStaffName(staffData?.name ?? "");
          setStaffId(staffData.id);
        }

        const today = getTodayKST();
        const [siteResult, attendanceResult] = await Promise.all([
          supabase.from("sites").select("*").eq("id", staffData.site_id).single(),
          supabase
            .from("attendance")
            .select("created_at")
            .eq("user_id", staffData.id)
            .eq("site_id", staffData.site_id)
            .eq("work_date", today)
            .maybeSingle(),
        ]);

        if (siteResult.error || !siteResult.data) {
          if (isMounted) {
            setErrorMsg("현장 정보를 불러올 수 없습니다.");
            setLoading(false);
          }
          return;
        }

        siteDataForGps = siteResult.data;
        if (isMounted) setSite(siteResult.data);

        if (attendanceResult.data) {
          if (isMounted) {
            setAttendanceStatus({
              hasCheckedIn: true,
              checkInTime: new Date(attendanceResult.data.created_at).toLocaleTimeString("ko-KR"),
            });
          }
        }

        if (isMounted) setLoading(false);

        const gpsPos = await gpsPromise;
        if (gpsPos && siteDataForGps && isMounted) {
          const dist = calculateDistance(gpsPos.lat, gpsPos.lng, siteDataForGps.lat, siteDataForGps.lng);
          setDistance(dist);
          setGpsLoading(false);
        }
      } catch (error) {
        console.error("데이터 로드 오류:", error);
        if (isMounted) {
          setErrorMsg("데이터를 불러오는 중 오류가 발생했습니다.");
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

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

  // 출근 체크
  const handleCheckIn = async () => {
    if (!site || !currentPosition || submitting) return;

    // 클릭 시점 재검증
    const dist = calculateDistance(currentPosition.lat, currentPosition.lng, site.lat, site.lng);
    if (dist > site.checkin_radius_m) {
      alert("현재 위치가 출근 반경을 벗어났습니다.");
      setDistance(dist);
      return;
    }

    const nowCheck = new Date();
    const nowHHMM = `${String(nowCheck.getHours()).padStart(2, "0")}:${String(nowCheck.getMinutes()).padStart(2, "0")}`;
    if (nowHHMM < site.checkin_start_time.substring(0, 5) || nowHHMM > site.checkin_end_time.substring(0, 5)) {
      alert("출근 가능 시간이 아닙니다.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSubmitting(false);
        return;
      }

      const today = getTodayKST();

      const { error } = await supabase.from("attendance").insert({
        site_id: site.id,
        user_id: staffId,
        work_date: today,
      });

      if (error) {
        if (error.code === "23505") {
          alert("이미 출근 체크가 완료되었습니다.");
          setAttendanceStatus({
            hasCheckedIn: true,
            checkInTime: new Date().toLocaleTimeString("ko-KR"),
          });
        } else {
          alert("출근 체크 실패: " + error.message);
        }
        setSubmitting(false);
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
    } finally {
      setSubmitting(false);
    }
  };

  const inRange = useMemo(() => {
    if (!site || distance === null) return false;
    return distance <= site.checkin_radius_m;
  }, [site, distance]);

  const canCheckIn = !attendanceStatus.hasCheckedIn && distance !== null && site !== null && inRange && inTime && !submitting;

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
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-3">
        <div className={`${staffUi.card} p-4 text-center`}>
          <div className="text-[18px] font-extrabold text-gray-900 leading-snug">{site?.name}</div>
          <div className="mt-1 text-sm text-gray-700">
            <span className="font-semibold">{staffName ? staffName : "직원"}</span>님, 안녕하세요! 😊
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white shadow px-3 py-3">
            <div className="text-[11px] text-gray-500">출근 가능 시간</div>
            <div className="mt-1 text-sm font-bold text-gray-900">
              {formatTimeHHMM(site?.checkin_start_time)} ~ {formatTimeHHMM(site?.checkin_end_time)}
            </div>
          </div>
          <div className="rounded-lg bg-white shadow px-3 py-3">
            <div className="text-[11px] text-gray-500">현재 시간</div>
            <div className="mt-1 text-sm font-bold text-gray-900">{currentHHMM}</div>
          </div>
        </div>

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

        {attendanceStatus.hasCheckedIn ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-green-800 font-extrabold">오늘 출근 완료</div>
            <div className="text-green-700 text-xs mt-1">출근 시각: {attendanceStatus.checkInTime}</div>
          </div>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={!canCheckIn}
            className={staffUi.buttonClass.primary}
          >
            {submitting ? "처리 중..." : canCheckIn ? "🏢 출근 체크하기" : "출근 불가"}
          </button>
        )}
      </div>
    </div>
  );
}