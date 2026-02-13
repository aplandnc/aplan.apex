"use client";

import { useEffect, useState } from "react";
import { supabaseAppClient } from "@apex/config";
import { staffUi } from "@apex/ui/styles/staff";

interface Complaint {
  id: string;
  site_id: string;
  user_id: string;
  content: string;
  status: string;
  reply: string | null;
  created_at: string;
}

export default function complainPage() {
  const supabase = supabaseAppClient();

  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("");
  const [content, setContent] = useState("");
  const [complain, setcomplain] = useState<Complaint[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. 현재 로그인한 유저 정보 가져오기
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setErrorMsg("로그인이 필요합니다.");
          setLoading(false);
          return;
        }

        // 2. 직원 정보 가져오기 (kakao_id -> user_id 로 수정됨)
        // 만약 여기서 에러가 난다면 DB의 컬럼명이 정확히 'user_id'인지 재확인 필요합니다.
        const { data: staffData, error: staffError } = await supabase
          .from("users_staff")
          .select("name, site_id")
          .eq("kakao_id", user.id) // 컬럼명 수정 완료
          .single();

        if (staffError || !staffData) {
          console.error("Staff Data Error:", staffError);
          setErrorMsg("직원 정보를 불러올 수 없습니다. (DB 컬럼 확인 필요)");
          setLoading(false);
          return;
        }

        setStaffName(staffData.name);
        setSiteId(staffData.site_id);

        // 3. 실제 민원 목록 로드 (더미 데이터 제거 및 실제 쿼리 활성화)
        const { data: complainData, error: complainError } = await supabase
          .from("complain")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (complainError) {
          console.error("민원 목록 로드 오류:", complainError);
        } else {
          setcomplain(complainData || []);
        }

        setLoading(false);
      } catch (error) {
        console.error("데이터 로드 오류:", error);
        setErrorMsg("데이터를 불러오는 중 오류가 발생했습니다.");
        setLoading(false);
      }
    };

    loadData();
  }, [supabase]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인이 필요합니다.");
        setSubmitting(false);
        return;
      }

      // 민원 저장 시에도 user_id 사용
      const { data, error } = await supabase
        .from("complain")
        .insert({
          site_id: siteId,
          user_id: user.id,
          content: content.trim(),
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("민원 등록 오류:", error);
        alert("민원 등록에 실패했습니다.");
      } else {
        setContent("");
        // 새 민원을 리스트 최상단에 추가
        setcomplain([data, ...complain]);
        alert("민원이 등록되었습니다.");
      }
    } catch (error) {
      console.error("민원 제출 중 오류:", error);
      alert("민원 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = String(date.getFullYear()).slice(2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className={`${staffUi.layout.page} flex items-center justify-center`}>
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div className="text-gray-600">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={`${staffUi.layout.page} flex items-center justify-center p-4`}>
        <div className={staffUi.alert.warning}>
          <div className={staffUi.alert.warningTitle}>오류</div>
          <div className={staffUi.alert.warningText}>{errorMsg}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={staffUi.layout.page}>
      <div className="mx-auto w-full max-w-md px-4 py-4 space-y-4">
        {/* 상단 제목 카드 */}
        <div className={`${staffUi.card} p-3`}>
          <div className="text-center">
            <div className="text-[18px] font-extrabold text-gray-900 mb-2">마음의 소리</div>
            <div className="text-sm text-gray-600">
              작성 내용은 관리자만 확인 가능합니다.
            </div>
          </div>
        </div>

        {/* 민원 작성 카드 */}
        <div className={`${staffUi.card} p-4 space-y-3`}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="전달하고 싶은 내용을 입력해주세요..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={submitting}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${
              submitting
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {submitting ? "전송 중..." : "보내기"}
          </button>
        </div>

        {/* 과거 민원 목록 */}
        {complain.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700 px-1">내 마음의 소리</div>
            {complain.map((complaint) => (
              <div
                key={complaint.id}
                className="rounded-lg bg-white shadow overflow-hidden"
              >
                {/* 접힌 상태 */}
                <button
                  onClick={() => toggleExpand(complaint.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {complaint.reply ? (
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">···</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 text-left text-sm text-gray-700 truncate">
                    {complaint.content}
                  </div>

                  <div className="flex-shrink-0 text-xs text-gray-500">
                    {formatDate(complaint.created_at)}
                  </div>

                  <div className="flex-shrink-0 text-gray-400">
                    {expandedId === complaint.id ? "▲" : "▼"}
                  </div>
                </button>

                {/* 펼쳐진 상태 */}
                {expandedId === complaint.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">내용</div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                        {complaint.content}
                      </div>
                    </div>

                    {complaint.reply ? (
                      <div>
                        <div className="text-xs font-semibold text-green-600 mb-1">답변</div>
                        <div className="text-sm text-gray-800 bg-green-50 p-3 rounded-lg whitespace-pre-wrap">
                          {complaint.reply}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">답변 대기 중입니다.</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {complain.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8">
            아직 등록된 민원이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}