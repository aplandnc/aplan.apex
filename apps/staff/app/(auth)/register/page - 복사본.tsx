'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAppClient } from '@apex/config';
import { type StaffType, type RegisterFormData } from '@apex/auth';

const STAFF_TYPES: StaffType[] = ['기획', '상담사', 'TM', '큐레이터', '아르바이트', '홍보단', '영업사원', '기타'];
const RANKS = ['팀장', '부장', '차장', '실장', '과장', '대리'];
const SALES_RANKS = ['총괄', '팀장', '부장', '차장', '실장', '과장', '대리', '사원', '기타'];
const HQ_LIST = Array.from({ length: 11 }, (_, i) => `${i}팀`);
const TEAM_LIST = Array.from({ length: 21 }, (_, i) => `${i}팀`);

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

  // ✅ 개인정보 안내 팝업(첫 진입 1회)
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [privacyAgree, setPrivacyAgree] = useState(false);

  // ✅ 차량정보 '해당 사항 없음'
  const [noCar, setNoCar] = useState(false);

  // ✅ 승인 게이트
  // - needs_login: 로그인 필요(자동 리다이렉트 금지, 오버레이만)
  // - needs_register: 로그인은 됐는데 users_staff row 없음 -> 폼 작성
  // - pending: 신청은 했는데 승인 전 -> 폼 비활성화 + 문구
  // - approved: 승인 완료 -> 홈으로 이동
  type StaffGate = 'checking' | 'needs_login' | 'needs_register' | 'pending' | 'approved';
  const [staffGate, setStaffGate] = useState<StaffGate>('checking');

  // ✅ staffGate에 따라 개인정보 팝업 노출 제어
  useEffect(() => {
    // 가입폼 보여줄 때만 개인정보 팝업 노출
    if (staffGate === 'needs_register') {
      setPrivacyOpen(true);
      setPrivacyAgree(false);
      return;
    }

    // 승인대기/승인완료/체킹/로그인필요 중에는 팝업 닫기
    if (privacyOpen) setPrivacyOpen(false);

    // pending에서는 기존 UX 유지 (이미 동의된 것으로 간주)
    if (staffGate === 'pending') setPrivacyAgree(true);
  }, [staffGate]); // privacyOpen은 의도적으로 deps에 안 넣음(불필요 렌더/플래시 방지)

  useEffect(() => {
    if (noCar) {
      setForm(prev => ({
        ...prev,
        car_model: '',
        car_color: '',
        car_number: ''
      }));
    }
  }, [noCar]);

  const loadSites = async () => {
    const { data, error } = await supabase.from('sites').select('id, name').order('name', { ascending: true });
    if (error) setSites([]);
    else setSites(data ?? []);
  };

  const loadKakaoName = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    const name = (user?.user_metadata as any)?.name;
    if (name) {
      setForm(prev => ({ ...prev, name }));
    }
  };

  useEffect(() => {
    loadKakaoName();
    loadSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ users_staff 승인/대기/미신청 분기
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
          .select('approved')
          .eq('kakao_id', authUser.id)
          .maybeSingle();

        if (cancelled) return;

        // 조회 에러는 기존 UX 깨지지 않게 "가입 가능"으로 둠
        if (error) {
          setStaffGate('needs_register');
          return;
        }

        // row 없음 → 회원가입 폼 정상
        if (!row) {
          setStaffGate('needs_register');
          return;
        }

        // approved = true → 홈으로 이동 (※ /staff 같은 경로 쓰면 404로 또 꼬임)
        if (row.approved) {
          setStaffGate('approved');
          router.replace('/');
          return;
        }

        // approved = false → 가입화면 그대로 + 전체 비활성화 + 문구
        setStaffGate('pending');
        setPrivacyOpen(false);
        setPrivacyAgree(true);
      } catch {
        if (!cancelled) setStaffGate('needs_login');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  const showRankField = ['기획', '상담사', 'TM'].includes(form.staff_type);
  const showSalesFields = form.staff_type === '영업사원';
  const showContactFields = showRankField || showSalesFields;

  // ✅ 차량정보는 3개 모두 입력하거나, '해당 사항 없음' 체크 중 하나는 반드시 충족
  const carFilledAll =
    Boolean((form as any).car_model?.trim()) &&
    Boolean((form as any).car_color?.trim()) &&
    Boolean((form as any).car_number?.trim());
  const carValid = noCar || carFilledAll;

  // ✅ 화면에 보이는 필수값들이 모두 채워졌을 때만 버튼 활성화
  const siteValid = Boolean(form.site_id);
  const nameValid = Boolean(form.name?.trim());
  const phoneValid = !showContactFields || Boolean(form.phone?.trim());
  const rankValid = !showRankField || Boolean((form as any).rank?.trim());
  const salesOrgValid =
    !showSalesFields ||
    (Boolean((form as any).hq?.trim()) && Boolean((form as any).team?.trim()) && Boolean((form as any).rank?.trim()));
  // 팝업은 동의해야만 닫히므로, 닫혀있으면 동의 완료로 간주
  const privacyValid = !privacyOpen;

  const isFormValid = siteValid && nameValid && phoneValid && rankValid && salesOrgValid && carValid && privacyValid;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ 대기 상태면 제출 차단
    if (staffGate === 'pending') return;

    // ✅ 로그인 안 된 상태면 자동 리다이렉트 금지 (루프 방지)
    if (staffGate === 'needs_login') {
      alert('카카오 로그인이 필요합니다.');
      return;
    }

    // 1) 차량정보 규칙
    if (!carValid) {
      alert("차량정보(차종/색상/차량번호)를 모두 입력하거나, '해당 사항 없음'을 체크하세요");
      return;
    }

    // 2) 화면에 보이는 필수값 규칙
    if (!siteValid) {
      alert('근무 현장을 선택하세요');
      return;
    }
    if (!nameValid) {
      alert('성명을 입력하세요');
      return;
    }
    if (showSalesFields && !salesOrgValid) {
      alert('영업사원은 본부/팀/직급을 모두 선택하세요');
      return;
    }
    if (showRankField && !rankValid) {
      alert('직급을 선택하세요');
      return;
    }
    if (showContactFields && !phoneValid) {
      alert('전화번호를 입력하세요');
      return;
    }
    if (!privacyValid) {
      alert('개인정보 안내에 동의 후 진행해주세요');
      return;
    }

    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const authUser = data?.user;

      if (!authUser) {
        // ✅ 자동 /login push 금지: gate만 바꿔서 오버레이로 처리
        setStaffGate('needs_login');
        return;
      }

      const { error } = await supabase.from('users_staff').insert({
        kakao_id: authUser.id,
        ...form,
        approved: false
      });

      if (error) throw error;
      setStaffGate('pending');
    } catch (error) {
      console.error(error);
      alert('가입 실패');
    } finally {
      setLoading(false);
    }
  };

  // ✅ pending 일 때 전체 비활성화용 플래그
  const isPending = staffGate === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 apex-cursorfix">
      {/* ✅ 카카오 로그인 필요 오버레이 (자동이동 없음) */}
      {staffGate === 'needs_login' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
            <div className="text-lg font-bold text-gray-900 select-none">카카오 로그인이 필요합니다</div>
            <div className="text-sm text-gray-600 mt-2 select-none">직원 등록 신청은 카카오 로그인 후 진행할 수 있어요.</div>

            <button
              type="button"
              onClick={() => router.push(`/login?redirectedFrom=${encodeURIComponent('/register')}`)}
              className="mt-5 w-full bg-yellow-400 hover:bg-yellow-500 text-black font-semibold py-3 rounded-lg transition cursor-pointer"
            >
              카카오로 로그인
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        html,
        body {
          cursor: default !important;
        }
        .apex-cursorfix,
        .apex-cursorfix * {
          cursor: default !important;
        }
        body *,
        #__next,
        main {
          cursor: default !important;
        }
        .apex-cursorfix input,
        .apex-cursorfix textarea {
          cursor: text !important;
        }
        .apex-cursorfix select,
        .apex-cursorfix button,
        .apex-cursorfix a {
          cursor: pointer !important;
        }
      `}</style>

      {/* ✅ 개인정보 안내 팝업 */}
      {privacyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="text-white text-lg font-bold select-none">- 개인정보 관련 안내 -</div>
              <div className="text-white/80 text-sm mt-1 select-none">개인정보 수집/이용자 : (주)에이플랜디앤씨</div>
            </div>

            <div className="p-5">
              <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                <p>입력하는 개인정보는 현장 근무인력 조회 및 관리 외의 다른 용도로 사용되지 않습니다.</p>
                <p>차종 및 차량번호는 주차장 내 차량관리 목적으로 사용됩니다.</p>
                <p>입력하신 모든 개인정보는 영업 종료 후 30일 이내 파기합니다.</p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <input
                  id="privacyAgree"
                  type="checkbox"
                  checked={privacyAgree}
                  onChange={e => setPrivacyAgree(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="privacyAgree" className="text-sm text-gray-800 select-none">
                  동의함
                </label>
              </div>

              <button
                type="button"
                disabled={!privacyAgree}
                onClick={() => setPrivacyOpen(false)}
                className="mt-4 w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 transition cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-md mx-auto">
        {/* ✅ 승인대기 오버레이 */}
        {isPending && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-lg">
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] rounded-lg" />
            <div className="relative z-10 bg-white border border-gray-200 shadow-xl rounded-2xl px-6 py-5 text-center">
              <div className="text-lg font-bold text-gray-900 select-none">관리자 승인 대기중입니다.</div>
              <div className="text-sm text-gray-600 mt-1 select-none">승인 완료 후 자동으로 직원앱으로 이동됩니다.</div>
            </div>
          </div>
        )}

        {/* ✅ pending이면 전체 포인터 차단 */}
        <div className={`bg-white rounded-lg shadow-lg p-6 cursor-default ${isPending ? 'pointer-events-none opacity-100' : ''}`}>
          <h1 className="text-2xl font-bold text-center mb-6 select-none cursor-default">APLAN 직원 등록</h1>

          <form onSubmit={handleSubmit} className="space-y-4 cursor-default">
            <div className="cursor-default">
              <label className="block text-sm font-medium mb-1 select-none cursor-default">근무 현장을 선택하세요</label>
              <select
                required
                value={form.site_id}
                onChange={e => setForm({ ...form, site_id: String(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                <option value="" disabled hidden>
                  선택
                </option>
                {sites.map(site => (
                  <option key={site.id} value={String(site.id)}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="cursor-default">
              <label className="block text-sm font-medium mb-1 select-none cursor-default">직무 구분을 선택하세요</label>
              <select
                required
                value={form.staff_type}
                onChange={e =>
                  setForm({
                    ...form,
                    staff_type: e.target.value as StaffType,
                    rank: '',
                    hq: '',
                    team: '',
                    sales_name: ''
                  } as any)
                }
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              >
                {STAFF_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="cursor-default">
              <label className="block text-sm font-medium mb-1 select-none cursor-default">성명(본명)</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                placeholder="본명을 입력해주세요"
              />
            </div>

            {showSalesFields && (
              <div className="cursor-default">
                <label className="block text-sm font-medium mb-1 select-none cursor-default">영업명</label>
                <input
                  type="text"
                  value={(form as any).sales_name || ''}
                  onChange={e => setForm({ ...(form as any), sales_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                  placeholder="영업명이 없으면 공란 또는 실명"
                />
              </div>
            )}

            {showRankField && (
              <div className="cursor-default">
                <label className="block text-sm font-medium mb-1 select-none cursor-default">직급을 선택하세요</label>
                <select
                  required
                  value={(form as any).rank || ''}
                  onChange={e => setForm({ ...(form as any), rank: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  <option value="">선택해주세요</option>
                  {RANKS.map(rank => (
                    <option key={rank} value={rank}>
                      {rank}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {showSalesFields && (
              <div className="grid grid-cols-3 gap-2 cursor-default">
                <div className="cursor-default">
                  <label className="block text-sm font-medium mb-1 select-none cursor-default">본부</label>
                  <select
                    required
                    value={(form as any).hq || ''}
                    onChange={e => setForm({ ...(form as any), hq: e.target.value })}
                    className="w-full border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="">본부 선택</option>
                    {HQ_LIST.map(hq => (
                      <option key={hq} value={hq}>
                        {hq}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cursor-default">
                  <label className="block text-sm font-medium mb-1 select-none cursor-default">팀</label>
                  <select
                    required
                    value={(form as any).team || ''}
                    onChange={e => setForm({ ...(form as any), team: e.target.value })}
                    className="w-full border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="">팀 선택</option>
                    {TEAM_LIST.map(team => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cursor-default">
                  <label className="block text-sm font-medium mb-1 select-none cursor-default">직급</label>
                  <select
                    required
                    value={(form as any).rank || ''}
                    onChange={e => setForm({ ...(form as any), rank: e.target.value })}
                    className="w-full border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  >
                    <option value="">선택</option>
                    {SALES_RANKS.map(rank => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {showContactFields && (
              <div className="cursor-default">
                <label className="block text-sm font-medium mb-1 select-none cursor-default">전화번호 입력(숫자만)</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                  placeholder="010-0000-0000"
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 cursor-default">
              <div className="cursor-default">
                <label className="block text-sm font-medium mb-1 select-none cursor-default">차종</label>
                <input
                  type="text"
                  value={(form as any).car_model || ''}
                  disabled={noCar}
                  onChange={e => setForm({ ...(form as any), car_model: e.target.value })}
                  className="w-full border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="차종"
                />
              </div>

              <div className="cursor-default">
                <label className="block text-sm font-medium mb-1 select-none cursor-default">색상</label>
                <input
                  type="text"
                  value={(form as any).car_color || ''}
                  disabled={noCar}
                  onChange={e => setForm({ ...(form as any), car_color: e.target.value })}
                  className="w-full border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="색상"
                />
              </div>

              <div className="cursor-default">
                <label className="block text-sm font-medium mb-1 select-none cursor-default">차량번호</label>
                <input
                  type="text"
                  value={(form as any).car_number || ''}
                  disabled={noCar}
                  onChange={e => setForm({ ...(form as any), car_number: e.target.value })}
                  className="w-full border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="차량번호"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 -mt-1">
              <input id="noCar" type="checkbox" checked={noCar} onChange={e => setNoCar(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="noCar" className="text-sm text-gray-800 select-none">
                차량 없음
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !isFormValid || staffGate === 'needs_login'}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition mt-6 cursor-pointer"
            >
              {loading ? '처리중...' : '가입 신청'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
