"use client";

import { useEffect, useMemo, useState } from "react";
import { staffUi } from "@apex/ui/styles/staff";
import { supabaseAppClient } from "@apex/config";

interface Notice {
  id: string;
  title: string;
  content: string;
  is_fixed: boolean;
  created_at: string;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}.`;
}

export default function NoticesPage() {
  const supabase = useMemo(() => supabaseAppClient(), []);

  const [loading, setLoading] = useState(true);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notices")
          .select("id, title, content, is_fixed, created_at")
          .order("is_fixed", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100);

        if (!error && data) setNotices(data as Notice[]);
        else setNotices([]);
      } catch (e) {
        console.error("공지사항 로드 실패", e);
        setNotices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, [supabase]);

  const openNotice = (notice: Notice) => setSelectedNotice(notice);
  const closeNotice = () => setSelectedNotice(null);

  return (
    <div className={`w-full max-w-md mx-auto p-4 bg-white ${staffUi.text.body}`}>
      <header className="mb-6 mt-4 px-2">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          공지사항
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          전달사항을 확인해주세요
        </p>
      </header>

      <div className="px-2">
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
            <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
            <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          </div>
        ) : notices.length > 0 ? (
          <div className="space-y-3">
            {notices.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotice(n)}
                className={`w-full text-left p-4 rounded-xl border transition-colors
                  ${
                    n.is_fixed
                      ? "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                      : "bg-gray-50 border-gray-100 active:bg-gray-100"
                  }`}
              >
                <div className="flex items-center gap-2">
                  {n.is_fixed && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      <span className="text-[12px] leading-none">📌</span>
                      고정
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-1">
                    {n.title}
                  </h3>
                </div>

                <span className="text-[11px] text-gray-400 mt-2 block">
                  {formatDate(n.created_at)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">
            등록된 공지사항이 없습니다.
          </div>
        )}
      </div>

      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/45" onClick={closeNotice} />

          <div className="relative w-[92%] max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {selectedNotice.is_fixed && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      <span className="text-[12px] leading-none">📌</span>
                      고정
                    </span>
                  )}
                  <h3 className="text-base font-bold text-gray-900 line-clamp-2">
                    {selectedNotice.title}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDate(selectedNotice.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeNotice}
                className="shrink-0 text-sm font-semibold text-gray-500 px-2 py-1 rounded-lg active:bg-gray-100"
              >
                닫기
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {selectedNotice.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
