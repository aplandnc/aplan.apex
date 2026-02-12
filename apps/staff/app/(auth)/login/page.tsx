"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  // 페이지 로드시 오래된 supabase 쿠키 전부 삭제
  useEffect(() => {
    if (typeof document !== "undefined") {
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        const name = cookie.split("=")[0].trim();
        if (name.startsWith("sb-")) {
          document.cookie = `${name}=; path=/; max-age=0`;
        }
      }
    }
  }, []);

  const handleKakaoLogin = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const supabase = supabaseAppClient();

      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: { redirectTo },
      });

      if (error) throw error;
    } catch (e) {
      console.error("로그인 실패:", e);
      alert("로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className={`${staffUi.layout.page} flex flex-col items-center justify-center bg-gray-50 min-h-screen p-6`}>
      {/* - px-6: 모바일에서 카드 안쪽의 좌우 여백 확보
         - max-w-sm: 모바일에서 카드가 너무 뚱뚱해지지 않게 너비 제한
         - shadow-md: 조금 더 부드러운 입체감 부여
      */}
      <div className="max-w-sm w-full px-8 py-10 bg-white rounded-[2.5rem] shadow-md border border-gray-100/50">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="mb-6">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="w-16 h-auto object-contain" 
            />
          </div>
          
          <h1 className={`${staffUi.text.titleLg} font-extrabold text-gray-900 tracking-tight`}>
            에이플랜 업무 시스템
          </h1>
          <p className={`mt-3 ${staffUi.text.body} text-gray-400 font-medium`}>
            카카오로 로그인 해주세요
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className={`${staffUi.buttonClass.kakao} w-full flex items-center justify-center gap-2 py-4.5 rounded-2xl font-bold transition-all active:scale-[0.96] hover:brightness-95 disabled:opacity-50 shadow-sm`}
            style={{ height: '56px' }} // 모바일 터치 타겟 최적화
          >
            {loading ? (
              <span className="flex items-center gap-2 text-sm">
                <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                인증 정보 확인 중...
              </span>
            ) : (
              <span className="text-[16px]">카카오로 로그인</span>
            )}
          </button>
          
          <p className="text-center text-[11px] text-gray-400 mt-6 leading-relaxed opacity-80">
            로그인 시 서비스 이용약관 및 <br/>개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
      
      <footer className="mt-10 text-[12px] text-gray-300 font-medium">
        © 2026 APLAN Corp.
      </footer>
    </div>
  );
}