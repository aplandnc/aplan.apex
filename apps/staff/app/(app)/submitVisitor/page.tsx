// apps/staff/app/(app)/submitVisitor/page.tsx
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

export default function SubmitVisitorPage() {
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    phone: '',
    visitDate: '',
    memo: '',
  });

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

          setStaffInfo({
            id: staff.id,
            name: staff.name || '',
            rank: staff.rank || '',
            hq: staff.hq || '',
            team: staff.team || '',
            site_id: staff.site_id,
            site_name: site?.name || '',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching staff info:', error);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 6) {
      return numbers.length === 5 ? `${numbers.slice(0, 1)}-${numbers.slice(1)}` : `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    }
    if (numbers.length <= 10) {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
    } else {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.phone || !formData.visitDate) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    if (!staffInfo) {
      alert('직원 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setLoading(true);
    const supabase = supabaseAppClient();

    const cleanName = formData.customerName.replace(/\s+/g, '');
    const purePhone = formData.phone.replace(/[^\d]/g, '');
    const phoneIndex = purePhone.length >= 4 ? purePhone.slice(-4) : purePhone;

    try {
      const { error } = await supabase
        .from('visitor_reserved')
        .insert([
          {
            site_id: staffInfo.site_id,
            user_id: staffInfo.id,
            guest_name: cleanName,
            phone: formData.phone,
            phone_index: phoneIndex,
            visit_plan: formData.visitDate,
            memo: formData.memo,
          }
        ]);

      if (error) throw error;

      alert('방문예정고객이 등록되었습니다');
      
      setFormData({
        customerName: '',
        phone: '',
        visitDate: '',
        memo: '',
      });

    } catch (error) {
      console.error('Submit error:', error);
      alert('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
                    <p className="text-xs text-blue-600 font-medium">등록현장</p>
                    <p className="text-sm font-bold text-gray-800">{staffInfo.site_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">👤</span>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">등록자</p>
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

          {/* 방문예정 등록 카드 */}
          <div className={staffUi.card}>
            <h2 className="text-base font-bold text-gray-800 mb-4">방문예정 등록</h2>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={staffUi.form.label}>
                  고객명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className={staffUi.inputClass()}
                  placeholder="고객명을 입력하세요"
                />
              </div>

              <div>
                <label className={staffUi.form.label}>
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={staffUi.inputClass()}
                  placeholder="전화번호 전체 또는 뒤 4~6자리"
                  maxLength={13}
                />
              </div>

              <div>
                <label className={staffUi.form.label}>
                  방문예정일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                  className={staffUi.inputClass()}
                />
              </div>

              <div>
                <label className={staffUi.form.label}>메모</label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className={staffUi.inputClass()}
                  placeholder="메모를 입력하세요 (선택)"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`${staffUi.buttonClass.primary} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}