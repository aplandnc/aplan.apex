"use client";

import * as React from "react";
import { supabaseAppClient } from "@apex/config";
import AdminPageShell from "@/components/AdminPageShell";
import { adminUi } from "@apex/ui/styles/admin";

type NoticeRow = {
  id: string;
  title: string;
  content: string;
  is_fixed: boolean;
  site_id: string | null;
  created_at: string;
  updated_at: string;
};

type Site = {
  id: string;
  name: string;
};

export default function NoticePage() {
  const [loading, setLoading] = React.useState(true);
  const [notices, setNotices] = React.useState<NoticeRow[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("");

  // 작성/수정 모달 관련
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ title: "", content: "", is_fixed: false });
  const [processing, setProcessing] = React.useState(false);

  const supabase = supabaseAppClient();

  // 현장 목록 로드
  React.useEffect(() => {
    async function fetchSites() {
      const { data } = await supabase.from("sites").select("id, name").order("name");
      if (data && data.length > 0) {
        setSites(data);
        setSelectedSiteId(data[0].id); // 첫 번째 현장 자동 선택
      }
    }
    fetchSites();
  }, [supabase]);

  // 공지사항 목록 로드
  const fetchNotices = React.useCallback(async () => {
    if (!selectedSiteId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .eq("site_id", selectedSiteId)
        .order("is_fixed", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedSiteId]);

  React.useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  // 모달 열기 (등록/수정 공통)
  const openModal = (notice?: NoticeRow) => {
    if (notice) {
      setEditingId(notice.id);
      setForm({ title: notice.title, content: notice.content, is_fixed: notice.is_fixed });
    } else {
      setEditingId(null);
      setForm({ title: "", content: "", is_fixed: false });
    }
    setIsModalOpen(true);
  };

  // 공지사항 저장
  const handleSave = async () => {
    if (!form.title || !form.content) return alert("제목과 내용을 입력해주세요.");
    setProcessing(true);

    try {
      const payload = { ...form, site_id: selectedSiteId };

      if (editingId) {
        const { error } = await supabase.from("notices").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notices").insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchNotices();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
      fetchNotices();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <AdminPageShell
      title="공지사항 관리"
      description="현장별 공지사항을 관리합니다."
      actions={
        <button className={adminUi.buttonClass.primary} onClick={() => openModal()}>
          공지 작성
        </button>
      }
    >
      {/* 현장 선택 (전체공지 제외) */}
      <div className={`${adminUi.card} mb-6`}>
        <h2 className="mb-3 text-sm font-medium text-gray-700">현장 선택</h2>
        <div className="grid grid-cols-5 gap-3">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                selectedSiteId === site.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 테이블 */}
      <div className={adminUi.card}>
        <div className={adminUi.tableWrap}>
          <table className={adminUi.table}>
            <thead>
              <tr className={adminUi.theadRow}>
                <th className={`${adminUi.th} w-16 text-center`}>고정</th>
                <th className={`${adminUi.th} min-w-[200px]`}>제목</th>
                <th className={`${adminUi.th} w-52 text-center`}>작성일시</th>
                <th className={`${adminUi.th} w-48 text-right`}>관리</th>
              </tr>
            </thead>
            <tbody className={adminUi.tbody}>
              {loading ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400">로딩 중...</td></tr>
              ) : notices.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-gray-400">등록된 공지사항이 없습니다.</td></tr>
              ) : (
                notices.map((n) => (
                  <tr key={n.id} className={adminUi.tr}>
                    <td className="px-4 py-3 text-center">
                      {n.is_fixed && <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="고정됨" />}
                    </td>
                    <td className={`${adminUi.td}`}>
                      <button 
                        onClick={() => openModal(n)}
                        className="text-left font-medium hover:text-blue-600 hover:underline transition-all"
                      >
                        {n.title}
                      </button>
                    </td>
                    <td className={`${adminUi.td} text-center text-gray-500 text-sm`}>
                      {new Date(n.created_at).toLocaleString("ko-KR", { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit' 
                      })}
                    </td>
                    <td className={`${adminUi.td} text-right`}>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openModal(n)} className={adminUi.buttonClass.secondarySm}>수정</button>
                        <button onClick={() => handleDelete(n.id)} className={adminUi.buttonClass.dangerSm}>삭제</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 작성/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? "공지사항 상세/수정" : "새 공지사항 작성"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">제목</label>
                <input
                  type="text"
                  className={adminUi.inputClass()}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="공지 제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">내용</label>
                <textarea
                  className={`${adminUi.inputClass()} min-h-[300px] leading-relaxed`}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="공지 내용을 입력하세요"
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_fixed_modal"
                  checked={form.is_fixed}
                  onChange={(e) => setForm({ ...form, is_fixed: e.target.checked })}
                  className="h-5 w-5 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="is_fixed_modal" className="text-sm font-medium text-gray-700 cursor-pointer">이 게시물을 리스트 최상단에 고정합니다.</label>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className={adminUi.buttonClass.secondary}>닫기</button>
              <button onClick={handleSave} disabled={processing} className={adminUi.buttonClass.primary}>
                {processing ? "처리 중..." : (editingId ? "수정 완료" : "등록하기")}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}