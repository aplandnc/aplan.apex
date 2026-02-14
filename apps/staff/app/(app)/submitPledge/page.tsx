// apps/staff/app/(app)/submitPledge/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";
import SignaturePad from 'react-signature-pad-wrapper';

interface StaffInfo {
  id: string; // users_staff 테이블의 실제 PK (UUID)
  name: string;
  rank: string;
  hq: string;
  team: string;
  site_name: string;
  site_id: string;
}

export default function SubmitPledgePage() {
  const [staffInfo, setStaffInfo] = useState<StaffInfo | null>(null);
  const [pledgeContent, setPledgeContent] = useState<string>('');
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const signaturePadRef = useRef<any>(null);

  useEffect(() => {
    fetchStaffInfo();
  }, []);

  const fetchStaffInfo = async () => {
    const supabase = supabaseAppClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // 1. users_staff 테이블에서 kakao_id(auth.user.id)를 이용해 실제 레코드 조회
      const { data: staff } = await supabase
        .from('users_staff')
        .select('id, name, rank, hq, team, site_id')
        .eq('kakao_id', user.id) // 로그인한 유저의 ID와 매칭
        .single();

      if (staff && staff.site_id) {
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', staff.site_id)
          .single();

        setStaffInfo({
          id: staff.id, // 여기서 가져온 UUID가 users_staff_pledge의 user_id로 들어갑니다.
          name: staff.name || '',
          rank: staff.rank || '',
          hq: staff.hq || '',
          team: staff.team || '',
          site_name: site?.name || '',
          site_id: staff.site_id,
        });

        // 2. 각서 내용 조회
        const { data: pledge } = await supabase
          .from('sites_workpledge')
          .select('content')
          .eq('site_id', staff.site_id)
          .single();

        if (pledge) setPledgeContent(pledge.content);

        // 3. 제출 여부 확인 (users_staff의 PK인 staff.id로 조회)
        const { data: existingDoc } = await supabase
          .from('users_staff_pledge')
          .select('id')
          .eq('user_id', staff.id)
          .eq('site_id', staff.site_id)
          .maybeSingle();

        if (existingDoc) setIsSubmitted(true);
      }
    }
  };

  const handleSignSave = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const dataUrl = signaturePadRef.current.toDataURL();
      setSignatureData(dataUrl);
      setShowSignPad(false);
    } else {
      alert('서명을 해주세요.');
    }
  };

  const handleSubmit = async () => {
    if (!signatureData || !staffInfo) {
      alert('서명을 먼저 완료해주세요.');
      return;
    }

    const supabase = supabaseAppClient();

    // 스키마에 정의된 대로 데이터 삽입
    const { error } = await supabase
      .from('users_staff_pledge')
      .insert({
        user_id: staffInfo.id,      // users_staff 테이블의 PK (UUID)를 참조
        site_id: staffInfo.site_id, // sites 테이블의 PK (UUID)를 참조
        sign_url: signatureData,    // Base64 서명 이미지 데이터
        is_submitted: true,
        submitted_at: new Date().toISOString(),
      });

    if (error) {
      console.error('저장 실패:', error);
      alert(`저장 실패: ${error.message}`);
    } else {
      setIsSubmitted(true);
      alert('제출이 완료되었습니다.');
    }
  };

  return (
    <div className={staffUi.layout.page}>
      <div className={staffUi.layout.main}>
        <div className="space-y-3">
          <div className="text-center py-4">
            <h1 className="text-xl font-bold text-gray-800">근무이행각서</h1>
          </div>

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
                    <p className="text-xs text-gray-600 font-medium">소속 및 성명</p>
                    <p className="text-sm font-bold text-gray-800">
                      {staffInfo.hq}본부 {staffInfo.team}팀 {staffInfo.name} {staffInfo.rank}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">정보 로딩 중...</p>
            )}
          </div>

          <div className={staffUi.card}>
            <h2 className="text-base font-bold text-gray-800 mb-3">각서 내용</h2>
            <style jsx global>{`
              .pledge-render-area { line-height: 1.7 !important; word-break: keep-all; }
              .pledge-render-area p { margin-bottom: 0.6rem; min-height: 1rem; }
              .pledge-render-area ol { list-style: none !important; padding-left: 0.2rem !important; counter-reset: item; }
              .pledge-render-area ol li { position: relative; padding-left: 1.4rem; margin-bottom: 0.4rem; counter-increment: item; }
              .pledge-render-area ol li::before { position: absolute; left: 0; font-weight: 600; }
              .pledge-render-area ol li:nth-child(1)::before { content: "①"; }
              .pledge-render-area ol li:nth-child(2)::before { content: "②"; }
              .pledge-render-area ol li:nth-child(3)::before { content: "③"; }
              .pledge-render-area ol li:nth-child(4)::before { content: "④"; }
              .pledge-render-area ol li:nth-child(5)::before { content: "⑤"; }
              .pledge-render-area ol li:nth-child(6)::before { content: "⑥"; }
              .pledge-render-area ol li:nth-child(7)::before { content: "⑦"; }
              .pledge-render-area ol li:nth-child(8)::before { content: "⑧"; }
              .pledge-render-area ol li:nth-child(9)::before { content: "⑨"; }
              .pledge-render-area ol li:nth-child(10)::before { content: "⑩"; }
            `}</style>
            <div 
              className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-80 overflow-y-auto pledge-render-area"
              dangerouslySetInnerHTML={{ __html: pledgeContent }}
            />
          </div>

          <div className={staffUi.card}>
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={check1} onChange={(e) => setCheck1(e.target.checked)} disabled={isSubmitted} className="mt-1 w-4 h-4" />
                <span className="text-sm text-gray-700">각서 내용을 숙지하였으며 이에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={check2} onChange={(e) => setCheck2(e.target.checked)} disabled={isSubmitted} className="mt-1 w-4 h-4" />
                <span className="text-sm text-gray-700">개인정보 수집 및 이용에 동의합니다.</span>
              </label>
            </div>
          </div>

          {!isSubmitted ? (
            <>
              {!signatureData ? (
                <button onClick={() => { if(!check1 || !check2) return alert('동의가 필요합니다.'); setShowSignPad(true); }} className={staffUi.buttonClass.primary}>서명하기</button>
              ) : (
                <div className="space-y-3">
                  <div className={staffUi.card}>
                    <img src={signatureData} alt="서명" className="border rounded bg-white w-full h-32 object-contain" />
                  </div>
                  <button onClick={handleSubmit} className={staffUi.buttonClass.primary}>최종 제출하기</button>
                </div>
              )}
            </>
          ) : (
            <div className={staffUi.card}>
              <p className="text-center text-base font-bold text-green-600">제출 완료</p>
            </div>
          )}
        </div>
      </div>

      {showSignPad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-4 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-center">전자 서명</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <SignaturePad ref={signaturePadRef} options={{ minWidth: 2, maxWidth: 4, penColor: 'black' }} />
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => signaturePadRef.current.clear()} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold">다시 쓰기</button>
              <button onClick={() => setShowSignPad(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold">취소</button>
              <button onClick={handleSignSave} className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold">서명완료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}