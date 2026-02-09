'use client';

import { useEffect, useState } from 'react';
import { supabaseAppClient } from '@apex/config';
import { adminUi } from '@apex/ui/styles/admin';
import '@apex/ui/styles/globals.css';

interface TimeSlot {
  time_slot: string;
  team_count: number;
  person_count: number;
}

const TIME_SLOTS = [
  '~10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00~',
];

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CounterPage() {
  const [slots, setSlots] = useState<TimeSlot[]>(
    TIME_SLOTS.map(slot => ({ time_slot: slot, team_count: 0, person_count: 0 }))
  );
  const [currentSlot, setCurrentSlot] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [memo, setMemo] = useState('');

  const supabase = supabaseAppClient();

  useEffect(() => {
    updateCurrentSlot();
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
      updateCurrentSlot();
    }, 1000);
    
    return () => {
      clearInterval(timeInterval);
    };
  }, []);

  const updateCurrentSlot = () => {
    const hour = new Date().getHours();
    if (hour < 10) {
      setCurrentSlot('~10:00');
    } else if (hour >= 18) {
      setCurrentSlot('18:00~');
    } else {
      setCurrentSlot(`${hour}:00-${hour + 1}:00`);
    }
  };

  const updateCount = (type: 'team' | 'person', delta: number) => {
    setSlots(prevSlots => {
      const newSlots = [...prevSlots];
      const slotIndex = newSlots.findIndex(s => s.time_slot === currentSlot);
      if (slotIndex !== -1) {
        if (type === 'team') {
          newSlots[slotIndex] = {
            ...newSlots[slotIndex],
            team_count: Math.max(0, newSlots[slotIndex].team_count + delta)
          };
        } else {
          newSlots[slotIndex] = {
            ...newSlots[slotIndex],
            person_count: Math.max(0, newSlots[slotIndex].person_count + delta)
          };
        }
      }
      return newSlots;
    });
  };

  const totalTeam = slots.reduce((sum, s) => sum + s.team_count, 0);
  const totalPerson = slots.reduce((sum, s) => sum + s.person_count, 0);

  const getCumulativeCount = (index: number, type: 'team' | 'person') => {
    return slots
      .slice(0, index + 1)
      .reduce((sum, s) => sum + (type === 'team' ? s.team_count : s.person_count), 0);
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

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  const renderCounter = (count: number) => {
    const digits = String(count).padStart(4, '0').split('');
    return (
      <div className="flex gap-2 justify-center">
        {digits.map((digit, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-b from-slate-700 to-slate-900 text-white rounded-xl shadow-xl border-2 border-slate-600 transition-all duration-300"
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

  if (loading) return <div className="p-6">로딩중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto space-y-6" style={{ maxWidth: '1400px' }}>
        {/* 제목 카드 */}
        <div className={adminUi.card}>
          <h1 className="text-3xl font-bold text-center py-2">방문자 집계</h1>
        </div>

        {/* 2열 레이아웃 */}
        <div className="grid grid-cols-2 gap-6">
          {/* 왼쪽: 날짜/시간 + 카운터 */}
          <div className="space-y-6">
            {/* 날짜/시간 카드 - 1행 2열 */}
            <div className={adminUi.card}>
              <div className="grid grid-cols-2 gap-4 p-3">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-2xl">📅</span>
                  <div className="text-base font-semibold text-gray-700">{formatDate()}</div>
                </div>
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-2xl">🕐</span>
                  <div className="text-xl font-bold text-blue-600 font-mono">{formatTime()}</div>
                </div>
              </div>
            </div>

            {/* 팀/인원 카운터 2열 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 팀 카운터 */}
              <div className={adminUi.card}>
                <div className="space-y-4 p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">팀</div>
                  </div>
                  <div className="mb-4">
                    {renderCounter(totalTeam)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={adminUi.buttonClass.danger}
                      style={{ fontSize: '1.5rem', padding: '0.8rem' }}
                      onClick={() => updateCount('team', -1)}
                    >
                      − 1
                    </button>
                    <button
                      className={adminUi.buttonClass.primary}
                      style={{ fontSize: '1.5rem', padding: '0.8rem' }}
                      onClick={() => updateCount('team', 1)}
                    >
                      + 1
                    </button>
                  </div>
                </div>
              </div>

              {/* 인원 카운터 */}
              <div className={adminUi.card}>
                <div className="space-y-4 p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">인원</div>
                  </div>
                  <div className="mb-4">
                    {renderCounter(totalPerson)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={adminUi.buttonClass.danger}
                      style={{ fontSize: '1.5rem', padding: '0.8rem' }}
                      onClick={() => updateCount('person', -1)}
                    >
                      − 1
                    </button>
                    <button
                      className={adminUi.buttonClass.primary}
                      style={{ fontSize: '1.5rem', padding: '0.8rem' }}
                      onClick={() => updateCount('person', 1)}
                    >
                      + 1
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 메모 카드 */}
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

          {/* 오른쪽: 집계 테이블 */}
          <div className={adminUi.card} style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
            <h2 className="text-lg font-semibold text-center py-3 border-b bg-gradient-to-r from-slate-50 to-slate-100 flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
              </svg>
              시간대별 방문자 현황
            </h2>
            <div className="p-4 flex-1">
              <table className="w-full h-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold" rowSpan={2} style={{ width: '130px' }}>
                      시간대
                    </th>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-center" colSpan={2}>
                      팀
                    </th>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-center" colSpan={2}>
                      인원
                    </th>
                  </tr>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-center">구간</th>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-center">누계</th>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-center">구간</th>
                    <th className="border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-center">누계</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ~10:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[0] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">~10:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[0]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(0, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[0]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(0, 'person'))}</td>
                  </tr>
                  
                  {/* 10:00-11:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[1] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">10:00-11:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[1]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(1, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[1]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(1, 'person'))}</td>
                  </tr>
                  
                  {/* 11:00-12:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[2] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">11:00-12:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[2]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(2, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[2]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(2, 'person'))}</td>
                  </tr>
                  
                  {/* 12:00-13:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[3] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">12:00-13:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[3]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(3, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[3]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(3, 'person'))}</td>
                  </tr>
                  
                  {/* 13:00-14:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[4] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">13:00-14:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[4]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(4, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[4]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(4, 'person'))}</td>
                  </tr>
                  
                  {/* 14:00-15:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[5] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">14:00-15:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[5]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(5, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[5]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(5, 'person'))}</td>
                  </tr>
                  
                  {/* 15:00-16:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[6] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">15:00-16:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[6]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(6, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[6]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(6, 'person'))}</td>
                  </tr>
                  
                  {/* 16:00-17:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[7] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">16:00-17:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[7]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(7, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[7]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(7, 'person'))}</td>
                  </tr>
                  
                  {/* 17:00-18:00 */}
                  <tr className={`transition-colors ${TIME_SLOTS[8] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">17:00-18:00</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[8]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(8, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[8]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(8, 'person'))}</td>
                  </tr>
                  
                  {/* 18:00~ */}
                  <tr className={`transition-colors ${TIME_SLOTS[9] === currentSlot ? 'bg-gradient-to-r from-cyan-100 via-cyan-50 to-cyan-100 border-l-4 border-cyan-500' : 'hover:bg-gray-100'}`}>
                    <td className="border border-gray-200 px-4 py-3 text-sm">18:00~</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[9]?.team_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(9, 'team'))}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(slots[9]?.person_count || 0)}</td>
                    <td className="border border-gray-200 px-4 py-3 text-sm text-right pr-3">{formatNumber(getCumulativeCount(9, 'person'))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}