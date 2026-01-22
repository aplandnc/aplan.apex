"use client";

import { useState, useEffect } from "react";
import { supabaseAppClient } from "@apex/config";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  // ✅ 페이지 로드시 오래된 supabase 쿠키 전부 삭제
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">직원 앱</h1>
          <p className="mt-2 text-gray-600">카카오로 로그인하세요</p>
        </div>

        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-black font-semibold py-3 px-4 rounded-lg transition"
        >
          {loading ? "이동 중..." : "카카오 로그인"}
        </button>
      </div>
    </div>
  );
}