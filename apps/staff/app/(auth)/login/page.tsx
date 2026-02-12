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
    <div className={`${staffUi.layout.page} flex flex-col items-center justify-center bg-gray-50 min-h-screen`}>
      <div className="max-w-md w-full px-6 py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center text-center mb-10">
          {/* 로고 섹션: w-18 대신 w-20(80px) 또는 w-[72px] 등을 사용해야 합니다. */}
          <div className="mb-8">
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="w-20 h-auto object-contain" 
            />
          </div>
          
          <h1 className={`${staffUi.text.titleLg} font-bold text-gray-900`}>
            에이플랜 업무 시스템
          </h1>
          <p className={`mt-2 ${staffUi.text.body} text-gray-500`}>
            아래 버튼을 눌러 로그인 해주세요
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className={`${staffUi.buttonClass.kakao} w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-50`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-current" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                연결 중...
              </span>
            ) : (
              "카카오 로그인"
            )}
          </button>
          
          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
            로그인 시 서비스 이용약관 및 <br/>개인정보 처리방침에 동의하게 됩니다.
          </p>
        </div>
      </div>
      
      <footer className="mt-8 text-sm text-gray-400">
        © 2026 APLAN Corp. All rights reserved.
      </footer>
    </div>
  );
}