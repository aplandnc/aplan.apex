// apps/staff/app/(app)/editProfile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";
import { type StaffType } from '@apex/auth';

const STAFF_TYPES: StaffType[] = ['기획', '상담사', 'TM', '큐레이터', '아르바이트', '홍보단', '영업사원', '기타'];
const RANKS = ['팀장', '부장', '차장', '실장', '과장', '대리'];
const SALES_RANKS = ['총괄', '팀장', '부장', '차장', '실장', '과장', '대리', '사원', '기타'];
const HQ_LIST = Array.from({ length: 11 }, (_, i) => `${i}팀`);
const TEAM_LIST = Array.from({ length: 21 }, (_, i) => `${i}팀`);

interface StaffData {
  site_id: string;
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

interface Site {
  id: string;
  name: string;
}

export default function EditProfilePage() {
  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [editMode, setEditMode] = useState({
    basic: false,
    organization: false,
    car: false,
  });
  const [formData, setFormData] = useState<StaffData>({
    site_id: '',
    site_name: '',
    staff_type: '',
    phone: '',
    rank: '',
    hq: '',
    team: '',
    sales_name: '',
    car_model: '',
    car_color: '',
    car_number: '',
  });

  useEffect(() => {
    const loadData = async () => {
      const supabase = supabaseAppClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // 모든 쿼리를 병렬 실행
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

      // sites 설정
      if (!sitesResult.error && sitesResult.data) {
        setSites(sitesResult.data);
      }

      // staff 정보 설정
      if (staffResult.data && staffResult.data.site_id) {
        const staff = staffResult.data;
        // sites 결과에서 현재 site 이름 찾기
        const currentSite = sitesResult.data?.find(s => s.id === staff.site_id);

        const data = {
          site_id: staff.site_id || '',
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
        };

        setStaffData(data);
        setFormData(data);
      }
    };

    loadData();
  }, []);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    
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

  const handleEdit = (section: 'basic' | 'organization' | 'car') => {
    if (editMode[section]) {
      // 취소: 해당 섹션만 원래 값으로 되돌림
      if (staffData) {
        if (section === 'basic') {
          setFormData(prev => ({
            ...prev,
            site_id: staffData.site_id,
            site_name: staffData.site_name,
            staff_type: staffData.staff_type,
            phone: staffData.phone,
            sales_name: staffData.sales_name,
          }));
        } else if (section === 'organization') {
          setFormData(prev => ({
            ...prev,
            hq: staffData.hq,
            team: staffData.team,
            rank: staffData.rank,
          }));
        } else if (section === 'car') {
          setFormData(prev => ({
            ...prev,
            car_model: staffData.car_model,
            car_color: staffData.car_color,
            car_number: staffData.car_number,
          }));
        }
      }
    }
    setEditMode({ ...editMode, [section]: !editMode[section] });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('수정 요청 데이터:', formData);
    // TODO: DB 업데이트 로직
  };

  const showSalesFields = formData.staff_type === '영업사원';
  const showRankField = ['기획', '상담사', 'TM'].includes(formData.staff_type);

  const getRankOptions = () => {
    if (formData.staff_type === '영업사원') return SALES_RANKS;
    if (['기획', '상담사', 'TM'].includes(formData.staff_type)) return RANKS;
    return [];
  };

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">기본 정보</h2>
              <button
                type="button"
                onClick={() => handleEdit('basic')}
                className="text-sm text-blue-600 font-medium"
              >
                {editMode.basic ? '취소' : '수정'}
              </button>
            </div>

            <div className="space-y-2.5">
              {/* 현장명 - 단독 */}
              {editMode.basic ? (
                <div>
                  <label className={staffUi.form.label}>현장명</label>
                  <select
                    value={formData.site_id}
                    onChange={(e) => {
                      const selectedSite = sites.find(s => s.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        site_id: e.target.value,
                        site_name: selectedSite?.name || ''
                      });
                    }}
                    className={staffUi.selectClass()}
                  >
                    <option value="">선택</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                  <span className="text-blue-600">📍</span>
                  <div className="flex-1">
                    <p className="text-xs text-blue-600">현장명</p>
                    <p className="text-sm font-bold text-gray-800">{staffData.site_name}</p>
                  </div>
                </div>
              )}

              {/* 직무 + 연락처 - 2열 그리드 */}
              {editMode.basic ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={staffUi.form.label}>직무</label>
                    <select
                      value={formData.staff_type}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        staff_type: e.target.value,
                        rank: '',
                        hq: '',
                        team: '',
                        sales_name: ''
                      })}
                      className={staffUi.selectClass()}
                    >
                      {STAFF_TYPES.map(type => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={staffUi.form.label}>연락처</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className={staffUi.inputClass()}
                      placeholder="010-0000-0000"
                      maxLength={13}
                    />
                  </div>
                </div>
              ) : (
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
              )}

              {/* 영업명 - 단독 (영업사원만) */}
              {showSalesFields && (
                <>
                  {editMode.basic ? (
                    <div>
                      <label className={staffUi.form.label}>영업명</label>
                      <input
                        type="text"
                        value={formData.sales_name}
                        onChange={(e) => setFormData({ ...formData, sales_name: e.target.value })}
                        className={staffUi.inputClass()}
                        placeholder="영업명을 입력하세요"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">🏷️</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">영업명</p>
                        <p className="text-sm font-bold text-gray-800">{staffData.sales_name || '-'}</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 소속 정보 카드 */}
          <div className={staffUi.card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">소속 정보</h2>
              <button
                type="button"
                onClick={() => handleEdit('organization')}
                className="text-sm text-blue-600 font-medium"
              >
                {editMode.organization ? '취소' : '수정'}
              </button>
            </div>

            <div className="space-y-2.5">
              {/* 영업사원인 경우 */}
              {showSalesFields ? (
                <>
                  {/* 본부 + 팀 - 2열 그리드 */}
                  {editMode.organization ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={staffUi.form.label}>본부</label>
                        <select
                          value={formData.hq}
                          onChange={(e) => setFormData({ ...formData, hq: e.target.value })}
                          className={staffUi.selectClass()}
                        >
                          <option value="">선택</option>
                          {HQ_LIST.map(hq => (
                            <option key={hq} value={hq}>
                              {hq}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={staffUi.form.label}>팀</label>
                        <select
                          value={formData.team}
                          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                          className={staffUi.selectClass()}
                        >
                          <option value="">선택</option>
                          {TEAM_LIST.map(team => (
                            <option key={team} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
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
                  )}

                  {/* 직급 - 단독 */}
                  {editMode.organization ? (
                    <div>
                      <label className={staffUi.form.label}>직급</label>
                      <select
                        value={formData.rank}
                        onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                        className={staffUi.selectClass()}
                      >
                        <option value="">선택</option>
                        {SALES_RANKS.map(rank => (
                          <option key={rank} value={rank}>
                            {rank}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">⭐</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">직급</p>
                        <p className="text-sm font-bold text-gray-800">{staffData.rank || '-'}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* 기획/상담사/TM인 경우 본부/팀 표시 - 2열 그리드 */}
                  {showRankField && (
                    <>
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

                      {/* 직급 - 단독 */}
                      {editMode.organization ? (
                        <div>
                          <label className={staffUi.form.label}>직급</label>
                          <select
                            value={formData.rank}
                            onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                            className={staffUi.selectClass()}
                          >
                            <option value="">선택</option>
                            {RANKS.map(rank => (
                              <option key={rank} value={rank}>
                                {rank}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                          <span className="text-gray-600">⭐</span>
                          <div className="flex-1">
                            <p className="text-xs text-gray-600">직급</p>
                            <p className="text-sm font-bold text-gray-800">{staffData.rank || '-'}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 차량 정보 카드 */}
          <div className={staffUi.card}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-800">차량 정보</h2>
              <button
                type="button"
                onClick={() => handleEdit('car')}
                className="text-sm text-blue-600 font-medium"
              >
                {editMode.car ? '취소' : '수정'}
              </button>
            </div>

            <div className="space-y-2.5">
              {/* 차종 + 색상 - 2열 그리드 */}
              {editMode.car ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={staffUi.form.label}>차종</label>
                    <input
                      type="text"
                      value={formData.car_model}
                      onChange={(e) => setFormData({ ...formData, car_model: e.target.value })}
                      className={staffUi.inputClass()}
                      placeholder="차종을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className={staffUi.form.label}>색상</label>
                    <input
                      type="text"
                      value={formData.car_color}
                      onChange={(e) => setFormData({ ...formData, car_color: e.target.value })}
                      className={staffUi.inputClass()}
                      placeholder="색상을 입력하세요"
                    />
                  </div>
                </div>
              ) : (
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
              )}

              {/* 차량번호 - 단독 */}
              {editMode.car ? (
                <div>
                  <label className={staffUi.form.label}>차량번호</label>
                  <input
                    type="text"
                    value={formData.car_number}
                    onChange={(e) => setFormData({ ...formData, car_number: e.target.value })}
                    className={staffUi.inputClass()}
                    placeholder="차량번호를 입력하세요"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">🔢</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">차량번호</p>
                    <p className="text-sm font-bold text-gray-800">{staffData.car_number || '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 수정 요청 버튼 */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmit}
              className={staffUi.buttonClass.primary}
            >
              수정 요청
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}