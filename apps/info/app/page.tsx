"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseAppClient } from "@apex/config";
import { adminUi } from "@apex/ui/styles/admin";

export default function InfoLoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setError("");
    setIsLoading(true);

    try {
      const supabase = supabaseAppClient();

      // sites 테이블에서 infodesk_id/pw로 직접 확인
      const { data: siteData, error: siteErr } = await supabase
        .from("sites")
        .select("id, name, checkin_type, visit_type")
        .eq("infodesk_id", userId)
        .eq("infodesk_pw", password)
        .maybeSingle();

      if (siteErr) {
        throw new Error(`로그인 실패: ${siteErr.message}`);
      }

      if (!siteData) {
        throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
      }

      sessionStorage.setItem("info_site", JSON.stringify(siteData));
      document.cookie = "apex-session=true; path=/; SameSite=Lax";

      // visit_type: true = 조직(예약), false = 일반
      if (siteData.visit_type) {
        router.replace("/type_reserved");
      } else {
        router.replace("/type_normal");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className={`${adminUi.card} max-w-md w-full space-y-8 p-8`}>
        <div className="text-center select-none">
          <img
            src="/logo.svg"
            alt="APEX Logo"
            className="mx-auto block h-14 w-auto object-contain mb-4"
            draggable={false}
          />
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-wide">
            에이플랜 방문자관리
          </h2>
          <p className="mt-2 text-sm text-gray-400">INFO DESK</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID
              </label>
              <input
                type="text"
                required
                className={adminUi.inputClass(isLoading)}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PASSWORD
              </label>
              <input
                type="password"
                required
                className={adminUi.inputClass(isLoading)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`${adminUi.buttonClass.primary} w-full`}
          >
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400 select-none">
        &copy; 2026 APlan. All rights reserved.
      </p>
    </div>
  );
}