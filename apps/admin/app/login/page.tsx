"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabaseAppClient } from "@apex/config";
import { adminUi } from "@apex/ui/styles/admin";

export default function LoginPage() {
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
      const email = `${userId}@aplan.apex`;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("로그인 정보를 찾을 수 없습니다.");

      const authUid = authData.user.id;

      const { data: adminData, error: adminErr } = await supabase
        .from("users_admin")
        .select("*")
        .eq("auth_uid", authUid)
        .eq("status", 1)
        .maybeSingle();

      if (adminErr) {
        // RLS 막혀도 여기로 떨어질 수 있음
        throw new Error(`관리자 권한 조회 실패: ${adminErr.message}`);
      }

      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error("관리자 권한이 없습니다");
      }

      sessionStorage.setItem("admin_info", JSON.stringify(adminData));

      // 세션 전용 쿠키 설정 (브라우저 닫으면 자동 삭제)
      document.cookie = "apex-session=true; path=/; SameSite=Lax";

      // 로그인 성공 후 이동
      router.replace("/");
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
            src="/img/logo.svg"
            alt="APEX Logo"
            className="mx-auto block h-14 w-auto object-contain mb-4"
            draggable={false}
          />
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-wide">APEX</h2>
          <p className="mt-2 text-sm text-gray-400">APlan EXecutive System</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
              <input
                type="text"
                required
                className={adminUi.inputClass(isLoading)}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PASSWORD</label>
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

          <button type="submit" disabled={isLoading} className={`${adminUi.buttonClass.primary} w-full`}>
            {isLoading ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400 select-none">&copy; 2026 APlan. All rights reserved.</p>
    </div>
  );
}