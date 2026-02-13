/**
 * 공통 유틸리티 함수 모음
 */

/**
 * 한국 시간(KST) 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getTodayKST = (): string => {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  })
    .format(new Date())
    .replace(/\. /g, "-")
    .replace(".", "");
};

/**
 * 두 좌표 간의 거리를 미터 단위로 계산 (Haversine 공식)
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // 지구 반지름 (미터)
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

/**
 * 시간 문자열을 HH:MM 형식으로 변환
 */
export const formatTimeHHMM = (time?: string): string => {
  if (!time) return "";
  return time.substring(0, 5);
};

/**
 * 현재 시간을 HH:MM 형식으로 반환
 */
export const getCurrentTimeHHMM = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};
