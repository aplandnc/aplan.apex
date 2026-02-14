'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAppClient } from '@apex/config';
import { type StaffType, type RegisterFormData } from '@apex/auth';
import { staffUi } from '@apex/ui/styles/staff';

const STAFF_TYPES: StaffType[] = ['기획', '상담사', 'TM', '큐레이터', '아르바이트', '홍보단', '영업사원', '기타'];
const RANKS = ['팀장', '부장', '차장', '실장', '과장', '대리'];
const SALES_RANKS = ['총괄', '팀장', '부장', '차장', '실장', '과장', '대리', '사원', '기타'];

// DB 저장을 위해 숫자 문자열만 배열로 생성
const HQ_LIST = Array.from({ length: 11 }, (_, i) => `${i}`);
const TEAM_LIST = Array.from({ length: 21 }, (_, i) => `${i}`);

type StaffStatus = 'pending' | 'approved' | 'rejected' | 'inactive' | string | null;

type StaffRowForGate = {
  id: string;
  status?: StaffStatus;
  approved?: boolean | null;
  rejected_reason?: string | null;
  name?: string | null;
  phone?: string | null;
  site_id?: string | null;
  staff_type?: string | null;
  rank?: string | null;
  hq?: string | null;
  team?: string | null;
  sales_name?: string | null;
  car_model?: string | null;
  car_color?: string | null;
  car_number?: string | null;
};

export default function RegisterPage() {
  const router = useRouter();
  const supabase = supabaseAppClient();

  const [form, setForm] = useState<RegisterFormData>({
    name: '',
    phone: '',
    site_id: '',
    staff_type: '기획',
    car_model: '',
    car_color: '',
    car_number: ''
  } as RegisterFormData);

  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyAgree, setPrivacyAgree] = useState(false);
  const [noCar, setNoCar] = useState(false);
  const [useSalesName, setUseSalesName] = useState(false);

  type StaffGate = 'checking' | 'needs_login' | 'needs_register' | 'pending' | 'rejected' | 'approved';
  const [staffGate, setStaffGate] = useState<StaffGate>('checking');
  const [rejectedReason, setRejectedReason] = useState<string>('');
  const [staffRowId, setStaffRowId] = useState<string | null>(null);

  useEffect(() => {
    if (staffGate === 'needs_register') {
      setPrivacyOpen(true);
      setPrivacyAgree(false);
      return;
    }
    if (privacyOpen) setPrivacyOpen(false);
    if (staffGate === 'pending' || staffGate === 'rejected') setPrivacyAgree(true);
  }, [staffGate]);

  useEffect(() => {
    if (noCar) {
      setForm(prev => ({ ...prev, car_model: '', car_color: '', car_number: '' }));
    }
  }, [noCar]);

  useEffect(() => {
    if (!useSalesName) {
      setForm(prev => ({ ...prev, sales_name: '' } as any));
    }
  }, [useSalesName]);

  const loadSites = async () => {
    const { data, error } = await supabase.from('sites').select('id, name').order('name', { ascending: true });
    if (error) setSites([]);
    else setSites(data ?? []);
  };

  const loadKakaoName = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    const name = (user?.user_metadata as any)?.name;
    if (name) setForm(prev => ({ ...prev, name: name.replace(/\s/g, '') }));
  };

  useEffect(() => {
    loadKakaoName();
    loadSites();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const authUser = data?.user;
        if (!authUser) {
          if (!cancelled) setStaffGate('needs_login');
          return;
        }
        const { data: row, error } = await supabase
          .from('users_staff')
          .select('id, status, approved, rejected_reason, site_id, staff_type, name, phone, rank, hq, team, sales_name, car_model, car_color, car_number')
          .eq('kakao_id', authUser.id)
          .maybeSingle();

        if (cancelled) return;
        if (error || !row) {
          setStaffGate('needs_register');
          setStaffRowId(null);
          setRejectedReason('');
          return;
        }

        const typedRow = row as StaffRowForGate;
        setStaffRowId(String(typedRow.id ?? '') || null);
        const status: StaffStatus = typedRow.status ?? (typedRow.approved ? 'approved' : 'pending');

        if (status === 'approved' || typedRow.approved) {
          setStaffGate('approved');
          router.replace('/staff');
          return;
        }
        if (status === 'rejected') {
          setStaffGate('rejected');
          setRejectedReason(String(typedRow.rejected_reason ?? ''));
          
          const hasSalesName = Boolean(typedRow.sales_name);
          setUseSalesName(hasSalesName);

          setForm(prev => ({
            ...(prev as any),
            site_id: String(typedRow.site_id ?? prev.site_id ?? ''),
            staff_type: (typedRow.staff_type as any) ?? (prev.staff_type as any),
            name: String(typedRow.name ?? prev.name ?? '').replace(/\s/g, ''),
            phone: String(typedRow.phone ?? prev.phone ?? ''),
            rank: (typedRow.rank as any) ?? (prev as any).rank ?? '',
            hq: (typedRow.hq as any) ?? (prev as any).hq ?? '',
            team: (typedRow.team as any) ?? (prev as any).team ?? '',
            sales_name: String(typedRow.sales_name ?? (prev as any).sales_name ?? '').replace(/\s/g, ''),
            car_model: String(typedRow.car_model ?? (prev as any).car_model ?? '').replace(/\s/g, ''),
            car_color: String(typedRow.car_color ?? (prev as any).car_color ?? '').replace(/\s/g, ''),
            car_number: String(typedRow.car_number ?? (prev as any).car_number ?? '').replace(/\s/g, '')
          }));
          setNoCar(false);
          return;
        }
        setStaffGate('pending');
        setRejectedReason('');
        setPrivacyOpen(false);
        setPrivacyAgree(true);
      } catch {
        if (!cancelled) setStaffGate('needs_login');
      }
    };
    run();
    return () => { cancelled = true; };
  }, [router, supabase]);

  const showRankField = ['기획', '상담사', 'TM'].includes(form.staff_type);
  const showSalesFields = form.staff_type === '영업사원';
  const showContactFields = showRankField || showSalesFields;

  const carFilledAll = Boolean((form as any).car_model?.trim()) && Boolean((form as any).car_color?.trim()) && Boolean((form as any).car_number?.trim());
  const carValid = noCar || carFilledAll;
  const siteValid = Boolean(form.site_id);
  const nameValid = Boolean(form.name?.trim());
  const phoneValid = !showContactFields || Boolean(form.phone?.trim());
  const rankValid = !showRankField || Boolean((form as any).rank?.trim());
  const salesOrgValid = !showSalesFields || (Boolean((form as any).hq?.trim()) && Boolean((form as any).team?.trim()) && Boolean((form as any).rank?.trim()));
  const salesNameValid = !showSalesFields || !useSalesName || Boolean((form as any).sales_name?.trim());
  const privacyValid = !privacyOpen;

  const isFormValid = siteValid && nameValid && phoneValid && rankValid && salesOrgValid && carValid && privacyValid && salesNameValid;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (staffGate === 'pending' || loading) return;
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;
      if (!authUser) { setStaffGate('needs_login'); return; }

      const finalForm = {
        ...form,
        sales_name: useSalesName ? (form as any).sales_name : null
      };

      if (staffRowId) {
        await supabase.from('users_staff').update({ kakao_id: authUser.id, ...finalForm, status: 'pending', approved_at: null, rejected_reason: null }).eq('id', staffRowId);
      } else {
        await supabase.from('users_staff').insert({ kakao_id: authUser.id, ...finalForm, status: 'pending', rejected_reason: null });
      }
      setRejectedReason('');
      setStaffGate('pending');
    } catch (error) {
      console.error(error);
      alert('가입 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const isPending = staffGate === 'pending';
  const isRejected = staffGate === 'rejected';

  return (
    <div className={`min-h-screen min-h-[100dvh] ${staffUi.layout.page} flex flex-col py-12 px-4 apex-cursorfix`}>
      <style jsx global>{`
        .apex-cursorfix, .apex-cursorfix * { cursor: default !important; }
        .apex-cursorfix input, .apex-cursorfix textarea { cursor: text !important; }
        .apex-cursorfix select, .apex-cursorfix button, .apex-cursorfix a { cursor: pointer !important; }
      `}</style>

      {/* 카카오 로그인 필요 오버레이 */}
      {staffGate === 'needs_login' && (
        <div className={staffUi.modal.overlay}>
          <div className={staffUi.modal.container}>
            <div className={`${staffUi.modal.title} select-none`}>카카오 로그인이 필요합니다</div>
            <div className={`${staffUi.modal.description} select-none`}>직원 등록 신청은 카카오 로그인 후 진행할 수 있어요.</div>
            <button type="button" onClick={() => router.push(`/login?redirectedFrom=${encodeURIComponent('/register')}`)} className={`mt-5 ${staffUi.buttonClass.kakao}`}>
              카카오로 로그인
            </button>
          </div>
        </div>
      )}

      {/* 개인정보 안내 팝업 */}
      {privacyOpen && (
        <div className={staffUi.modal.overlay}>
          <div className={`relative w-full ${staffUi.modal.containerMd}`}>
            <div className={`${staffUi.modal.header} text-center`}>
              <div className={`${staffUi.modal.headerTitle} w-full select-none`}>- 개인정보 관련 안내 -</div>
              <div className={`${staffUi.modal.headerSubtitle} w-full select-none`}>개인정보 수집/이용자 : (주)에이플랜디앤씨</div>
            </div>
            <div className={staffUi.modal.body}>
              <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                <p>입력하는 개인정보는 현장 근무인력 조회 및 관리 외의 다른 용도로 사용되지 않습니다.</p>
                <p>차종 및 차량번호는 주차장 내 차량관리 목적으로 사용됩니다.</p>
                <p>입력하신 모든 개인정보는 영업 종료 후 30일 이내 파기합니다.</p>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <input id="privacyAgree" type="checkbox" checked={privacyAgree} onChange={e => setPrivacyAgree(e.target.checked)} className={staffUi.form.checkbox} />
                <label htmlFor="privacyAgree" className={staffUi.form.checkboxLabel}>동의함</label>
              </div>
              <button type="button" disabled={!privacyAgree} onClick={() => setPrivacyOpen(false)} className={`mt-4 ${staffUi.buttonClass.primary} disabled:bg-gray-400`}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-md mx-auto w-full">
        {isRejected && rejectedReason?.trim() && (
          <div className={`mb-6 ${staffUi.alert.warning}`}>
            <div className={`${staffUi.alert.warningTitle} select-none`}>반려 사유</div>
            <div className={staffUi.alert.warningText}>{rejectedReason}</div>
          </div>
        )}

        <div className="relative">
          {isPending && (
            <div className="absolute inset-0 z-40 flex items-center justify-center">
              <div className={`relative z-10 ${staffUi.alert.pending}`}>
                <div className={`${staffUi.modal.title} select-none`}>관리자 승인 대기중입니다.</div>
                <div className={`${staffUi.text.body} mt-1 select-none text-center`}>승인 완료 후 자동으로 직원앱으로 이동됩니다.</div>
              </div>
            </div>
          )}

          <div className={`${staffUi.cardLg} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
            <h1 className={`${staffUi.text.title} text-center mb-8 select-none`}>APLAN 직원 등록</h1>

            <form onSubmit={handleSubmit} className={staffUi.form.group}>
              <div className={staffUi.form.field}>
                <label className={staffUi.form.label}>근무 현장</label>
                <select required value={form.site_id} onChange={e => setForm({ ...form, site_id: String(e.target.value) })} className={staffUi.selectClass()}>
                  <option value="" disabled hidden>현장을 선택하세요</option>
                  {sites.map(site => (<option key={site.id} value={String(site.id)}>{site.name}</option>))}
                </select>
              </div>

              <div className={staffUi.form.field}>
                <label className={staffUi.form.label}>직무 구분</label>
                <select required value={form.staff_type} onChange={e => setForm({ ...form, staff_type: e.target.value as StaffType, rank: '', hq: '', team: '', sales_name: '' } as any)} className={staffUi.selectClass()}>
                  {STAFF_TYPES.map(type => (<option key={type} value={type}>{type}</option>))}
                </select>
              </div>

              <div className={staffUi.form.field}>
                <label className={staffUi.form.label}>성명 (본명)</label>
                <input 
                  type="text" 
                  required 
                  value={form.name} 
                  onChange={e => setForm({ ...form, name: e.target.value.replace(/\s/g, '') })} 
                  className={staffUi.inputClass()} 
                  placeholder="실명을 입력해주세요" 
                />
              </div>

              {showSalesFields && (
                <div className={staffUi.form.field}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input 
                      id="useSalesName" 
                      type="checkbox" 
                      checked={useSalesName} 
                      onChange={e => setUseSalesName(e.target.checked)} 
                      className={staffUi.form.checkbox} 
                    />
                    <label 
                      htmlFor="useSalesName" 
                      className={`${staffUi.form.label} !mb-0 cursor-pointer`}
                    >
                      영업명(가명) 사용할 경우 체크
                    </label>
                  </div>
                  <input 
                    type="text" 
                    value={(form as any).sales_name || ''} 
                    disabled={!useSalesName}
                    onChange={e => setForm({ ...(form as any), sales_name: e.target.value.replace(/\s/g, '') })} 
                    className={staffUi.inputClass(!useSalesName)} 
                    placeholder="영업명 입력" 
                  />
                </div>
              )}

              {showRankField && (
                <div className={staffUi.form.field}>
                  <label className={staffUi.form.label}>직급</label>
                  <select required value={(form as any).rank || ''} onChange={e => setForm({ ...(form as any), rank: e.target.value })} className={staffUi.selectClass()}>
                    <option value="">선택해주세요</option>
                    {RANKS.map(rank => (<option key={rank} value={rank}>{rank}</option>))}
                  </select>
                </div>
              )}

              {showSalesFields && (
                <div className="grid grid-cols-3 gap-2">
                  <div className={staffUi.form.field}>
                    <label className={staffUi.form.label}>본부</label>
                    <select required value={(form as any).hq || ''} onChange={e => setForm({ ...(form as any), hq: e.target.value })} className={staffUi.selectClass()}>
                      <option value="">선택</option>
                      {HQ_LIST.map(hq => (<option key={hq} value={hq}>{hq}본부</option>))}
                    </select>
                  </div>
                  <div className={staffUi.form.field}>
                    <label className={staffUi.form.label}>팀</label>
                    <select required value={(form as any).team || ''} onChange={e => setForm({ ...(form as any), team: e.target.value })} className={staffUi.selectClass()}>
                      <option value="">선택</option>
                      {TEAM_LIST.map(team => (<option key={team} value={team}>{team}팀</option>))}
                    </select>
                  </div>
                  <div className={staffUi.form.field}>
                    <label className={staffUi.form.label}>직급</label>
                    <select required value={(form as any).rank || ''} onChange={e => setForm({ ...(form as any), rank: e.target.value })} className={staffUi.selectClass()}><option value="">선택</option>{SALES_RANKS.map(rank => (<option key={rank} value={rank}>{rank}</option>))}</select>
                  </div>
                </div>
              )}

              {showContactFields && (
                <div className={staffUi.form.field}>
                  <label className={staffUi.form.label}>전화번호</label>
                  <input type="tel" required value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} className={staffUi.inputClass()} placeholder="010-0000-0000" inputMode="numeric" />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className={staffUi.form.field}>
                  <label className={staffUi.form.label}>차종</label>
                  <input 
                    type="text" 
                    value={(form as any).car_model || ''} 
                    disabled={noCar} 
                    onChange={e => setForm({ ...(form as any), car_model: e.target.value.replace(/\s/g, '') })} 
                    className={staffUi.inputClass(noCar)} 
                    placeholder="차종" 
                  />
                </div>
                <div className={staffUi.form.field}>
                  <label className={staffUi.form.label}>색상</label>
                  <input 
                    type="text" 
                    value={(form as any).car_color || ''} 
                    disabled={noCar} 
                    onChange={e => setForm({ ...(form as any), car_color: e.target.value.replace(/\s/g, '') })} 
                    className={staffUi.inputClass(noCar)} 
                    placeholder="색상" 
                  />
                </div>
                <div className={staffUi.form.field}>
                  <label className={staffUi.form.label}>번호</label>
                  <input 
                    type="text" 
                    value={(form as any).car_number || ''} 
                    disabled={noCar} 
                    onChange={e => setForm({ ...(form as any), car_number: e.target.value.replace(/\s/g, '') })} 
                    className={staffUi.inputClass(noCar)} 
                    placeholder="번호" 
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 -mt-2">
                <input id="noCar" type="checkbox" checked={noCar} onChange={e => setNoCar(e.target.checked)} className={staffUi.form.checkbox} />
                <label htmlFor="noCar" className={staffUi.form.checkboxLabel}>차량 없음</label>
              </div>

              <button type="submit" disabled={loading || !isFormValid || staffGate === 'needs_login'} className={`${staffUi.buttonClass.primary} mt-6`}>
                {loading ? '처리중...' : isRejected ? '재신청' : '등록 신청'}
              </button>
            </form>
          </div>
        </div>
        
        <footer className="mt-12 mb-8 text-center">
          <p className={staffUi.text.hint}>© 2026 APLAN Corp. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}