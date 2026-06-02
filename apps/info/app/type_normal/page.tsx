'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminUi } from '@apex/ui/styles/admin';
import '@apex/ui/styles/globals.css';

interface SiteInfo {
  id: string;
  name: string;
}

interface TimeSlot {
  time_slot: string;
  team_count: number;
  person_count: number;
}

const TIME_SLOTS = [
  '~10:00', '10:00-11:00', '11:00-12:00', '12:00-13:00', '13:00-14:00',
  '14:00-15:00', '15:00-16:00', '16:00-17:00', '17:00-18:00', '18:00~',
];

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CounterPage() {
  const router = useRouter();
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>(
    TIME_SLOTS.map(slot => ({ time_slot: slot, team_count: 0, person_count: 0 }))
  );
  const [currentSlot, setCurrentSlot] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [memo, setMemo] = useState('');

  // 0. 사이트 정보 로드
  useEffect(() => {
    const raw = sessionStorage.getItem("info_site");
    if (raw) {
      try {
        setSite(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // 1. 초기 데이터 로드
  const fetchInitialData = useCallback(async () => {
    if (!site) return;

    try {
      const res = await fetch(`/api/visitor-count?site_id=${site.id}`);
      const result = await res.json();

      if (result.data) {
        const newSlots = TIME_SLOTS.map((slot, index) => ({
          time_slot: slot,
          team_count: result.data[`t${index + 1}`] || 0,
          person_count: result.data[`p${index + 1}`] || 0,
        }));
        setSlots(newSlots);
        setMemo(result.data.memo || '');
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }
    setLoading(false);
  }, [site]);

  // 2. 데이터 로드 + 시간 업데이트
  useEffect(() => {
    if (!site) return;

    fetchInitialData();
    updateCurrentSlot();

    // 시간 업데이트 (1초마다)
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
      updateCurrentSlot();
    }, 1000);

    // 데이터 폴링 (5초마다)
    const dataInterval = setInterval(() => {
      fetchInitialData();
    }, 5000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(dataInterval);
    };
  }, [site, fetchInitialData]);

  const updateCurrentSlot = () => {
    const hour = new Date().getHours();
    if (hour < 10) setCurrentSlot('~10:00');
    else if (hour >= 18) setCurrentSlot('18:00~');
    else setCurrentSlot(`${hour}:00-${hour + 1}:00`);
  };

  const updateCount = async (type: 'team' | 'person', delta: number) => {
    if (!site) return;

    const slotIndex = TIME_SLOTS.indexOf(currentSlot);
    if (slotIndex === -1) return;

    const columnName = `${type === 'team' ? 't' : 'p'}${slotIndex + 1}`;

    // 낙관적 업데이트
    setSlots(prev => {
      const next = [...prev];
      const target = { ...next[slotIndex] };
      if (type === 'team') target.team_count = Math.max(0, target.team_count + delta);
      else target.person_count = Math.max(0, target.person_count + delta);
      next[slotIndex] = target;
      return next;
    });

    // API 요청
    try {
      const res = await fetch("/api/visitor-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id, column_name: columnName, delta }),
      });

      if (!res.ok) {
        throw new Error("Update failed");
      }
    } catch (err) {
      console.error('Update failed:', err);
      fetchInitialData();
    }
  };

  const totalTeam = slots.reduce((sum, s) => sum + s.team_count, 0);
  const totalPerson = slots.reduce((sum, s) => sum + s.person_count, 0);

  const getCumulativeCount = (index: number, type: 'team' | 'person') => {
    return slots.slice(0, index + 1).reduce((sum, s) => sum + (type === 'team' ? s.team_count : s.person_count), 0);
  };

  const formatDate = () => {
    const year = currentTime.getFullYear();
    const month = String(currentTime.getMonth() + 1).padStart(2, '0');
    const date = String(currentTime.getDate()).padStart(2, '0');
    const day = DAYS[currentTime.getDay()];
    return `${year}년 ${month}월 ${date}일 ${day}요일`;
  };

  const formatTime = () => {
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatNumber = (num: number) => num.toLocaleString('ko-KR');

  const handleLogout = () => {
    sessionStorage.removeItem("info_site");
    document.cookie = "apex-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/");
  };

  const renderCounter = (count: number) => {
    const digits = String(count).padStart(4, '0').split('');
    return (
      <div className="flex gap-2 justify-center">
        {digits.map((digit, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-b from-slate-700 to-slate-900 text-white rounded-xl shadow-xl border-2 border-slate-600"
            style={{ width: '60px', height: '90px' }}
          >
            <div className="flex items-center justify-center h-full text-5xl font-bold font-mono">
              {digit}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-lg">현장 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (loading) return <div className="p-6">로딩중...</div>;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 p-6">
      <div className="flex-1 min-h-0 overflow-y-auto mx-auto space-y-6" style={{ maxWidth: '1400px' }}>
        <div className={adminUi.card}>
          <h1 className="text-3xl font-bold text-center py-2">방문자 집계</h1>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className={adminUi.card}>
              <div className="flex items-center gap-4 p-3">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1">
                  <span className="text-2xl">📅</span>
                  <div className="text-base font-semibold text-gray-700">{formatDate()}</div>
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1">
                  <span className="text-2xl">🕐</span>
                  <div className="text-xl font-bold text-blue-600 font-mono">{formatTime()}</div>
                </div>
                <button onClick={handleLogout} className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium hover:bg-gray-200 transition-colors shrink-0">로그아웃</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className={adminUi.card}>
                <div className="space-y-4 p-4">
                  <div className="text-center"><div className="text-2xl font-bold">팀</div></div>
                  <div className="mb-4">{renderCounter(totalTeam)}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className={adminUi.buttonClass.danger} onClick={() => updateCount('team', -1)} style={{ fontSize: '1.5rem' }}>−</button>
                    <button className={adminUi.buttonClass.primary} onClick={() => updateCount('team', 1)} style={{ fontSize: '1.5rem' }}>+</button>
                  </div>
                </div>
              </div>

              <div className={adminUi.card}>
                <div className="space-y-4 p-4">
                  <div className="text-center"><div className="text-2xl font-bold">인원</div></div>
                  <div className="mb-4">{renderCounter(totalPerson)}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className={adminUi.buttonClass.danger} onClick={() => updateCount('person', -1)} style={{ fontSize: '1.5rem' }}>−</button>
                    <button className={adminUi.buttonClass.primary} onClick={() => updateCount('person', 1)} style={{ fontSize: '1.5rem' }}>+</button>
                  </div>
                </div>
              </div>
            </div>

            <div className={adminUi.card}>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-3">메모</h2>
                <textarea
                  className={adminUi.inputClass()}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  rows={6}
                  style={{ resize: 'none' }}
                />
              </div>
            </div>
          </div>

          <div className={adminUi.card} style={{ padding: 0 }}>
            <h2 className="text-lg font-semibold text-center py-3 border-b bg-gray-50">시간대별 방문자 현황</h2>
            <div className="p-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border p-2" rowSpan={2}>시간대</th>
                    <th className="border p-2" colSpan={2}>팀</th>
                    <th className="border p-2" colSpan={2}>인원</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border p-2">구간</th><th className="border p-2">누계</th>
                    <th className="border p-2">구간</th><th className="border p-2">누계</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, idx) => (
                    <tr key={idx} className={slot.time_slot === currentSlot ? 'bg-cyan-50 font-bold border-l-4 border-cyan-500' : 'hover:bg-gray-50'}>
                      <td className="border p-3 text-center text-sm">{slot.time_slot}</td>
                      <td className="border p-3 text-right pr-4">{formatNumber(slot.team_count)}</td>
                      <td className="border p-3 text-right pr-4 bg-gray-50/50">{formatNumber(getCumulativeCount(idx, 'team'))}</td>
                      <td className="border p-3 text-right pr-4">{formatNumber(slot.person_count)}</td>
                      <td className="border p-3 text-right pr-4 bg-gray-50/50">{formatNumber(getCumulativeCount(idx, 'person'))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}