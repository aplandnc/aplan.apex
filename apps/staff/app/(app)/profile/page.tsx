// apps/staff/app/(app)/editProfile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";

interface StaffData {
  site_name: string;
  staff_type: string;
  phone: string;
  rank: string;
  hq: string;
  team: string;
  sales_name: string;
  car_model: string;
  car_color: string;
  car_number: string;
}

export default function EditProfilePage() {
  const [staffData, setStaffData] = useState<StaffData | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const supabase = supabaseAppClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const [staffResult, sitesResult] = await Promise.all([
        supabase
          .from('users_staff')
          .select('site_id, staff_type, phone, rank, hq, team, sales_name, car_model, car_color, car_number')
          .eq('kakao_id', user.id)
          .single(),
        supabase
          .from('sites')
          .select('id, name')
          .order('name', { ascending: true }),
      ]);

      if (staffResult.data && staffResult.data.site_id) {
        const staff = staffResult.data;
        const currentSite = sitesResult.data?.find(s => s.id === staff.site_id);

        setStaffData({
          site_name: currentSite?.name || '',
          staff_type: staff.staff_type || '',
          phone: staff.phone || '',
          rank: staff.rank || '',
          hq: staff.hq || '',
          team: staff.team || '',
          sales_name: staff.sales_name || '',
          car_model: staff.car_model || '',
          car_color: staff.car_color || '',
          car_number: staff.car_number || '',
        });
      }
    };

    loadData();
  }, []);

  const showSalesFields = staffData?.staff_type === '영업사원';
  const showRankField = ['기획', '상담사', 'TM'].includes(staffData?.staff_type ?? '');

  if (!staffData) {
    return (
      <div className={staffUi.layout.page}>
        <div className={staffUi.layout.main}>
          <div className={staffUi.card}>
            <p className="text-sm text-gray-500">정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={staffUi.layout.page}>
      <div className={staffUi.layout.main}>
        <div className="space-y-3">
          {/* 기본 정보 카드 */}
          <div className={staffUi.card}>
            <h2 className="text-base font-bold text-gray-800 mb-4">기본 정보</h2>

            <div className="space-y-2.5">
              {/* 현장명 */}
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                <span className="text-blue-600">📍</span>
                <div className="flex-1">
                  <p className="text-xs text-blue-600">현장명</p>
                  <p className="text-sm font-bold text-gray-800">{staffData.site_name}</p>
                </div>
              </div>

              {/* 직무 + 연락처 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">💼</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">직무</p>
                    <p className="text-sm font-bold text-gray-800">{staffData.staff_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">📱</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">연락처</p>
                    <p className="text-sm font-bold text-gray-800">{staffData.phone || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 영업명 (영업사원만) */}
              {showSalesFields && (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">🏷️</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">영업명</p>
                    <p className="text-sm font-bold text-gray-800">{staffData.sales_name || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 소속 정보 카드 */}
          <div className={staffUi.card}>
            <h2 className="text-base font-bold text-gray-800 mb-4">소속 정보</h2>

            <div className="space-y-2.5">
              {(showSalesFields || showRankField) && (
                <>
                  {/* 본부 + 팀 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">🏢</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">본부</p>
                        <p className="text-sm font-bold text-gray-800">{staffData.hq || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">👥</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">팀</p>
                        <p className="text-sm font-bold text-gray-800">{staffData.team || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* 직급 */}
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">⭐</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">직급</p>
                      <p className="text-sm font-bold text-gray-800">{staffData.rank || '-'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 차량 정보 카드 */}
          <div className={staffUi.card}>
            <h2 className="text-base font-bold text-gray-800 mb-4">차량 정보</h2>

            <div className="space-y-2.5">
              {/* 차종 + 색상 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">🚗</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">차종</p>
                    <p className="text-sm font-bold text-gray-800">{staffData.car_model || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">🎨</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">색상</p>
                    <p className="text-sm font-bold text-gray-800">{staffData.car_color || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 차량번호 */}
              <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                <span className="text-gray-600">🔢</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">차량번호</p>
                  <p className="text-sm font-bold text-gray-800">{staffData.car_number || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="py-3 text-center">
            <p className="text-sm text-gray-400">
              직원 정보 수정이 필요한 경우 관리자에게 문의해 주세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}