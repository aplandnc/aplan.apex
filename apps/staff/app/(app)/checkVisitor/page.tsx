// apps/staff/app/(app)/checkVisitor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";

interface StaffInfo {
  id: string;
  name: string;
  rank: string;
  hq: string;
  team: string;
  site_id: string;
  site_name: string;
}

interface VisitorRecord {
  id: string;
  guest_name: string;
  phone: string;
  visit_plan: string;
  memo: string | null;
  created_at: string;
}

export default function CheckVisitorPage() {
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchStaffInfo();
  }, []);

  const fetchStaffInfo = async () => {
    try {
      const supabase = supabaseAppClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: staff } = await supabase
          .from('users_staff')
          .select('id, name, rank, hq, team, site_id')
          .eq('kakao_id', user.id)
          .single();

        if (staff && staff.site_id) {
          const { data: site } = await supabase
            .from('sites')
            .select('name')
            .eq('id', staff.site_id)
            .single();

          const staffData = {
            id: staff.id,
            name: staff.name || '',
            rank: staff.rank || '',
            hq: staff.hq || '',
            team: staff.team || '',
            site_id: staff.site_id,
            site_name: site?.name || '',
          };

          setStaffInfo(staffData);
          fetchVisitors(staff.id);
        }
      }
    } catch (error) {
      console.error('Error fetching staff info:', error);
      setLoading(false);
    }
  };

  const fetchVisitors = async (userId: string) => {
    try {
      const supabase = supabaseAppClient();
      const { data, error } = await supabase
        .from('visitor_reserved')
        .select('id, guest_name, phone, visit_plan, memo, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisitors(data || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const supabase = supabaseAppClient();
      const { error } = await supabase
        .from('visitor_reserved')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setVisitors(prev => prev.filter(v => v.id !== id));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('Delete error:', error);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className={staffUi.layout.page}>
      <div className={staffUi.layout.main}>
        <div className="space-y-3">
          {/* 등록자 정보 카드 */}
          <div className={staffUi.card}>
            {staffInfo ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                  <span className="text-blue-600">📍</span>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">현장</p>
                    <p className="text-sm font-bold text-gray-800">{staffInfo.site_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">👤</span>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">담당자</p>
                    <p className="text-sm font-bold text-gray-800">
                      {staffInfo.hq}본부 {staffInfo.team}팀 {staffInfo.name} {staffInfo.rank}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">정보를 불러오는 중...</p>
            )}
          </div>

          {/* 내 고객 목록 카드 */}
          <div className={staffUi.card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">내 고객 관리</h2>
              <span className="text-sm text-gray-500">총 {visitors.length}건</span>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500 text-center py-8">불러오는 중...</p>
            ) : visitors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-4xl mb-2">📋</p>
                <p className="text-sm text-gray-500">등록된 고객이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800">{visitor.guest_name}</p>
                        <p className="text-sm text-gray-600 mt-1">{visitor.phone}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            방문예정 {formatDate(visitor.visit_plan)}
                          </span>
                        </div>
                        {visitor.memo && (
                          <p className="text-xs text-gray-500 mt-2 bg-white p-2 rounded">
                            💬 {visitor.memo}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteTarget(visitor.id)}
                        className="ml-2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-[10003] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-800 mb-2">삭제 확인</h3>
            <p className="text-sm text-gray-600 mb-4">
              이 고객 정보를 삭제하시겠습니까?<br />
              삭제 후에는 복구할 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
