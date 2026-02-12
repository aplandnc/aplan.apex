// apps/staff/app/(app)/submitVisitor/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";

interface StaffInfo {
  name: string;
  rank: string;
  hq: string;
  team: string;
  site_name: string;
}

export default function SubmitVisitorPage() {
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
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
    const supabase = supabaseAppClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: staff, error: staffError } = await supabase
        .from('users_staff')
        .select('name, rank, hq, team, site_id')
        .eq('kakao_id', user.id)
        .single();

      console.log('Staff data:', staff, 'Error:', staffError);

      if (staff && staff.site_id) {
        const { data: site, error: siteError } = await supabase
          .from('sites')
          .select('name')
          .eq('id', staff.site_id)
          .single();

        console.log('Site data:', site, 'Error:', siteError);

        setStaffInfo({
          name: staff.name || '',
          rank: staff.rank || '',
          hq: staff.hq || '',
          team: staff.team || '',
          site_name: site?.name || '',
        });
      }
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    
    // 4자리: 그대로
    if (numbers.length <= 4) return numbers;
    
    // 5~6자리: 0-0000 또는 00-0000
    if (numbers.length <= 6) {
      if (numbers.length === 5) {
        return `${numbers.slice(0, 1)}-${numbers.slice(1)}`;
      }
      return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    }
    
    // 전체 전화번호
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
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.phone || !formData.visitDate) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    console.log('제출 데이터:', formData);
    // TODO: DB 저장 로직
  };

  return (
    <div className={staffUi.layout.page}>
      <div className={staffUi.layout.main}>
        <div className="space-y-3">
          {/* 등록자 정보 카드 */}
          <div className={staffUi.card}>
            {staffInfo ? (
              <div className="space-y-2.5">
                {/* 등록현장 */}
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                  <span className="text-blue-600">📍</span>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">등록현장</p>
                    <p className="text-sm font-bold text-gray-800">{staffInfo.site_name}</p>
                  </div>
                </div>
                
                {/* 등록자 정보 */}
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">👤</span>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">등록자</p>
                    <p className="text-sm font-bold text-gray-800">
                      {staffInfo.hq} {staffInfo.team} {staffInfo.name} {staffInfo.rank}
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
              {/* 고객명 */}
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

              {/* 연락처 */}
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

              {/* 방문예정일 */}
              <div>
                <label className={staffUi.form.label}>
                  방문예정일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.visitDate}
                  onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                  className={staffUi.inputClass()}
                  placeholder="방문예정일을 선택하세요"
                />
              </div>

              {/* 메모 */}
              <div>
                <label className={staffUi.form.label}>
                  메모
                </label>
                <input
                  type="text"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  className={staffUi.inputClass()}
                  placeholder="메모를 입력하세요 (선택)"
                />
              </div>

              {/* 제출 버튼 */}
              <div className="pt-2">
                <button type="submit" className={staffUi.buttonClass.primary}>
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}