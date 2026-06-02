"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { staffUi } from "@apex/ui/styles/staff";
import { supabaseAppClient } from "@apex/config";

interface WeatherData {
  temp: number;
  maxTemp: number;
  minTemp: number;
  locationName: string;
  rainProbability: number;
  pm10: number;
  weatherLabel: string;
  weatherIcon: string;
  timestamp: number;
}

interface Notice {
  id: string;
  title: string;
  content?: string;
  created_at: string;
  is_fixed: boolean;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}.`;
}

export default function StaffHomePage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = supabaseAppClient();

        const savedWeather = sessionStorage.getItem("weather_cache");
        if (savedWeather) {
          const parsed = JSON.parse(savedWeather) as WeatherData;
          const isExpired = Date.now() - parsed.timestamp > 1800000;
          if (!isExpired) {
            setWeather(parsed);
          }
        }

        let gpsStarted = false;
        if (typeof window !== "undefined" && navigator.geolocation && !savedWeather) {
          gpsStarted = true;
          navigator.geolocation.getCurrentPosition(
            (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
            () => console.warn("위치 권한 거부"),
            { timeout: 10000, maximumAge: 300000 }
          );
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const [staffResult, noticesResult] = await Promise.all([
            supabase.from("users_staff").select("name").eq("kakao_id", user.id).single(),
            supabase.from("notices")
              .select("id, title, is_fixed, created_at")
              .order("is_fixed", { ascending: false })
              .order("created_at", { ascending: false })
              .limit(3),
          ]);

          setUserName(staffResult.data?.name || "직원");

          if (!noticesResult.error && noticesResult.data) {
            setNotices(noticesResult.data as Notice[]);
          }
        } else {
          setUserName("직원");
          const { data: noticeData, error: noticeError } = await supabase
            .from("notices")
            .select("id, title, is_fixed, created_at")
            .order("is_fixed", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(3);

          if (!noticeError && noticeData) {
            setNotices(noticeData as Notice[]);
          }
        }

        if (!gpsStarted && savedWeather) {
          const parsed = JSON.parse(savedWeather) as WeatherData;
          const isExpired = Date.now() - parsed.timestamp > 1800000;
          if (isExpired && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
              () => console.warn("위치 권한 거부"),
              { timeout: 10000, maximumAge: 300000 }
            );
          }
        }
      } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
      }
    };

    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const [weatherRes, geoRes] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min&hourly=precipitation_probability,pm10&current_weather=true&timezone=auto`
          ),
          fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`
          ),
        ]);

        const weatherData = await weatherRes.json();
        const geoData = await geoRes.json();

        const admin = geoData.localityInfo?.administrative || [];
        const province = admin.find((i: any) => i.name.endsWith("도") || i.name.includes("특별"))?.name || "";
        const city = admin.find((i: any) => (i.name.endsWith("시") || i.name.endsWith("군")) && !i.name.endsWith("도"))?.name || "";
        const locationName = `${province} ${city}`.trim() || "현재 위치";

        const now = new Date();
        const hour = now.getHours();
        const code = weatherData.current_weather.weathercode;

        const getStatus = (c: number) => {
          if (c <= 3) return { label: "맑음", icon: "☀️" };
          if (c <= 67) return { label: "비", icon: "🌧️" };
          if (c <= 77) return { label: "눈", icon: "❄️" };
          return { label: "흐림", icon: "☁️" };
        };
        const status = getStatus(code);

        const newWeatherData: WeatherData = {
          temp: Math.round(weatherData.current_weather.temperature),
          maxTemp: Math.round(weatherData.daily.temperature_2m_max[0]),
          minTemp: Math.round(weatherData.daily.temperature_2m_min[0]),
          locationName,
          rainProbability: weatherData.hourly.precipitation_probability[hour] || 0,
          pm10: Math.round(weatherData.hourly?.pm10?.[hour] || 0),
          weatherLabel: status.label,
          weatherIcon: status.icon,
          timestamp: Date.now(),
        };

        setWeather(newWeatherData);
        sessionStorage.setItem("weather_cache", JSON.stringify(newWeatherData));
      } catch (error) {
        console.error("날씨 정보 갱신 실패", error);
      }
    };

    fetchData();
  }, []);

  const handleNoticeClick = async (notice: Notice) => {
    setSelectedNotice(notice);
    setIsModalOpen(true);

    // 상세 내용이 없는 경우 Supabase에서 가져옴
    if (!notice.content) {
      const supabase = supabaseAppClient();
      const { data, error } = await supabase
        .from("notices")
        .select("content")
        .eq("id", notice.id)
        .single();

      if (!error && data) {
        setSelectedNotice({ ...notice, content: data.content });
      }
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto p-4 min-h-full bg-white ${staffUi.text.body}`}>
      <header className="mb-8 mt-4 px-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          {userName ? `${userName}님, 안녕하세요!` : "반갑습니다"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">오늘도 좋은 하루 되세요</p>
      </header>

      {/* 날씨 섹션 */}
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow mb-8">
        {!weather ? (
          <div className="animate-pulse space-y-4 py-2">
            <div className="mx-auto w-32 h-4 bg-gray-50 rounded" />
            <div className="h-12 bg-gray-50 rounded" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <span className="text-[13px] font-bold text-gray-900 bg-gray-50 px-3 py-1 rounded-full">
                {weather.locationName}
              </span>
            </div>

            <div className="grid grid-cols-3 items-center w-full text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-4xl font-light text-gray-900 leading-none tracking-tighter">
                  {weather.temp}°
                </span>
                <div className="flex flex-col text-[12px] leading-tight text-left">
                  <span className="text-red-500 font-bold">↑ {weather.maxTemp}°</span>
                  <span className="text-blue-500 font-bold">↓ {weather.minTemp}°</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center border-x border-gray-200 px-2 min-w-[85px]">
                <span className="text-3xl mb-2 leading-none">{weather.weatherIcon}</span>
                <span className="text-[12px] text-gray-500 leading-none font-medium">
                  {weather.weatherLabel}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center gap-2.5 pl-1">
                <div className="flex items-center w-[75px] gap-2">
                  <span className="text-sm w-4 text-center">☔</span>
                  <span className="text-[12px] font-bold text-blue-600">
                    {weather.rainProbability}%
                  </span>
                </div>
                <div className="flex items-center w-[75px] gap-2">
                  <span className="text-sm w-4 text-center">😷</span>
                  <span
                    className={`text-[12px] font-bold ${
                      weather.pm10 > 80 ? "text-orange-500" : "text-green-600"
                    }`}
                  >
                    {weather.pm10 <= 30 ? "좋음" : weather.pm10 <= 80 ? "보통" : "나쁨"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 공지사항 섹션 */}
      <div className="px-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">공지사항</h2>
          <Link href="/notice" className="text-xs text-gray-400">
            더보기 <span className="ml-1">››</span>
          </Link>
        </div>

        <div className="space-y-3">
          {notices.length > 0 ? (
            notices.map((notice) => (
              <button
                key={notice.id}
                onClick={() => handleNoticeClick(notice)}
                className={`w-full text-left p-4 rounded-xl border transition-all active:scale-[0.98] ${
                  notice.is_fixed
                    ? "bg-indigo-50 border-indigo-200 shadow-sm"
                    : "bg-gray-50 border-gray-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  {notice.is_fixed && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      <span className="text-[12px] leading-none">📌</span>
                      고정
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">
                    {notice.title}
                  </h3>
                </div>

                <span className="text-[11px] text-gray-400 mt-2 block">
                  {formatDate(notice.created_at)}
                </span>
              </button>
            ))
          ) : (
            <div className="text-center py-10 text-gray-400 text-sm">
              등록된 공지사항이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 공지사항 모달 */}
      {isModalOpen && selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div 
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedNotice.is_fixed && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">고정공지</span>
                    )}
                    <span className="text-[11px] text-gray-400">{formatDate(selectedNotice.created_at)}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">
                    {selectedNotice.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="h-[1px] bg-gray-100 w-full mb-5" />

              <div className="max-h-[60vh] overflow-y-auto pr-2">
                {selectedNotice.content ? (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {selectedNotice.content}
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-gray-400">내용을 불러오는 중입니다...</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-8 py-4 bg-gray-900 text-white rounded-xl font-bold text-sm active:bg-gray-800 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
          <div className="fixed inset-0 -z-10" onClick={() => setIsModalOpen(false)} />
        </div>
      )}

      <footer className="mt-16 text-center text-gray-300 text-[10px] font-medium tracking-widest uppercase pb-10">
        APLAN D & C
      </footer>
    </div>
  );
}