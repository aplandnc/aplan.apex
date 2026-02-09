// apps/staff/app/(app)/submitPledge/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";
import SignaturePad from 'react-signature-pad-wrapper';

interface StaffInfo {
  name: string;
  rank: string;
  hq: string;
  team: string;
  site_name: string;
  site_id: string;
}

interface PledgeContent {
  content: string;
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
      const { data: staff } = await supabase
        .from('users_staff')
        .select('name, rank, hq, team, site_id')
        .eq('kakao_id', user.id)
        .single();

      if (staff && staff.site_id) {
        const { data: site } = await supabase
          .from('sites')
          .select('name')
          .eq('id', staff.site_id)
          .single();

        setStaffInfo({
          name: staff.name || '',
          rank: staff.rank || '',
          hq: staff.hq || '',
          team: staff.team || '',
          site_name: site?.name || '',
          site_id: staff.site_id,
        });

        // 각서 내용 가져오기
        const { data: pledge } = await supabase
          .from('sites_workpledge')
          .select('content')
          .eq('site_id', staff.site_id)
          .single();

        if (pledge) {
          setPledgeContent(pledge.content);
        }

        // 이미 제출했는지 확인
        const { data: existingDoc } = await supabase
          .from('users_staff_docs')
          .select('id')
          .eq('user_id', user.id)
          .eq('site_id', staff.site_id)
          .single();

        if (existingDoc) {
          setIsSubmitted(true);
        }
      }
    }
  };

  const handleSignClick = () => {
    if (!check1 || !check2) {
      alert('모든 항목에 동의해주세요.');
      return;
    }
    setShowSignPad(true);
  };

  const handleSignClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
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
    if (!signatureData) {
      alert('서명을 먼저 완료해주세요.');
      return;
    }

    const supabase = supabaseAppClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !staffInfo) return;

    const { error } = await supabase
      .from('users_staff_docs')
      .insert({
        user_id: user.id,
        site_id: staffInfo.site_id,
        name: staffInfo.name,
        pledge_signature: signatureData,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      });

    if (error) {
      console.error('저장 실패:', error);
      alert('저장에 실패했습니다.');
    } else {
      setIsSubmitted(true);
      alert('제출이 완료되었습니다.');
    }
  };

  return (
    <div className={staffUi.layout.page}>
      <div className={staffUi.layout.main}>
        <div className="space-y-3">
          {/* 제목 */}
          <div className="text-center py-4">
            <h1 className="text-xl font-bold text-gray-800">근무이행각서</h1>
          </div>

          {/* 등록현장 및 소속 정보 */}
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
              <p className="text-sm text-gray-500">정보를 불러오는 중...</p>
            )}
          </div>

          {/* 각서 내용 */}
          <div className={staffUi.card}>
            <h2 className="text-base font-bold text-gray-800 mb-3">각서 내용</h2>
            <div 
              className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-80 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: pledgeContent }}
            />
          </div>

          {/* 동의 체크박스 */}
          <div className={staffUi.card}>
            <div className="space-y-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={check1}
                  onChange={(e) => setCheck1(e.target.checked)}
                  disabled={isSubmitted}
                  className="mt-1 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  상기 본인은 본 근무이행각서의 내용을 숙지하였으며 이에 동의합니다.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={check2}
                  onChange={(e) => setCheck2(e.target.checked)}
                  disabled={isSubmitted}
                  className="mt-1 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  업무 진행을 위한 개인정보 수집 및 이용에 동의합니다.
                </span>
              </label>
            </div>
          </div>

          {/* 확인자 */}
          {staffInfo && (
            <div className="text-center py-3">
              <p className="text-sm font-bold text-gray-800">
                확인자: {staffInfo.name} (인)
              </p>
            </div>
          )}

          {/* 서명 또는 제출 완료 */}
          {!isSubmitted ? (
            <>
              {!signatureData ? (
                <button
                  onClick={handleSignClick}
                  className={staffUi.buttonClass.primary}
                >
                  서명하기
                </button>
              ) : (
                <div className="space-y-3">
                  <div className={staffUi.card}>
                    <p className="text-sm text-gray-600 mb-2">서명 완료</p>
                    <img src={signatureData} alt="서명" className="border rounded" />
                  </div>
                  <button
                    onClick={handleSubmit}
                    className={staffUi.buttonClass.primary}
                  >
                    저장
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={staffUi.card}>
              <p className="text-center text-base font-bold text-green-600">
                제출 완료
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 서명 패드 모달 */}
      {showSignPad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-bold mb-3">서명</h3>
            <div className="border border-gray-300 rounded">
              <SignaturePad
                ref={signaturePadRef}
                options={{
                  minWidth: 1,
                  maxWidth: 3,
                  penColor: 'black',
                }}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSignClear}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                다시 쓰기
              </button>
              <button
                onClick={() => setShowSignPad(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSignSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}