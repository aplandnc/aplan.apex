"use client";

import * as React from "react";
import { supabaseAppClient } from "@apex/config";
import AdminPageShell from "@/components/AdminPageShell";
import { adminUi } from "@apex/ui/styles/admin";

type StaffRow = {
  id: string;
  kakao_id: string | null;
  name: string | null;
  phone: string | null;
  staff_type: string | null;
  site_id: string | null;
  created_at: string | null;

  // 조직/직급
  hq: string | null;
  team: string | null;
  rank: string | null;

  // status 기반 운영
  status?: "pending" | "approved" | "rejected" | string | null;
  rejected_reason?: string | null;

  // legacy(있어도 안 씀)
  approved?: boolean | null;
  approved_at?: string | null;
};

type SiteNameMap = Record<string, string>;

type TableColumn = {
  key: string;
  header: string;
  render: (r: StaffRow) => React.ReactNode;
};

type Site = {
  id: string;
  name: string;
};

export default function ApprovalPage() {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<StaffRow[]>([]);
  const [siteNameById, setSiteNameById] = React.useState<SiteNameMap>({});
  const [error, setError] = React.useState<string | null>(null);

  // 현장 관련 state
  const [sites, setSites] = React.useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("");

  // 체크박스 및 일괄처리
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [currentTarget, setCurrentTarget] = React.useState<{ ids: string[]; isBulk: boolean } | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);

  // 페이지네이션
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const supabase = supabaseAppClient();

  // 토스트 자동 숨김
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 현장 목록 로드
  React.useEffect(() => {
    async function fetchSites() {
      const { data } = await supabase.from("sites").select("id, name").order("name");

      if (data) {
        setSites(data);
        if (data.length > 0) {
          setSelectedSiteId(data[0].id); // 첫 번째 현장 자동 선택
        }
      }
    }
    fetchSites();
  }, [supabase]);

  // 선택된 현장 변경시 데이터 다시 로드
  React.useEffect(() => {
    if (selectedSiteId) {
      fetchPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  // 승인 처리 (status만 사용)
  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return;

    setProcessing(true);

    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabase.from("users_staff").update({ status: "approved" }).eq("id", id);

          if (error) throw error;
          return id;
        })
      );

      setToast(`승인 완료 (${results.length}건)`);
      setSelectedIds(new Set());
      await fetchPending();
    } catch (e: any) {
      console.error("[approval] 승인 실패:", e?.message ?? e);
      alert(e?.message ?? "승인 실패");
    } finally {
      setProcessing(false);
    }
  };

  // 반려 처리 (status + rejected_reason)
  const handleReject = async (ids: string[], reason: string) => {
    if (ids.length === 0) return;
    if (!reason.trim()) {
      alert("반려 사유를 입력하세요.");
      return;
    }

    setProcessing(true);

    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const { error } = await supabase
            .from("users_staff")
            .update({
              status: "rejected",
              rejected_reason: reason.trim(),
            })
            .eq("id", id);

          if (error) throw error;
          return id;
        })
      );

      setToast(`반려 완료 (${results.length}건)`);
      setSelectedIds(new Set());
      await fetchPending();

      setRejectModalOpen(false);
      setRejectReason("");
      setCurrentTarget(null);
    } catch (e: any) {
      console.error("[approval] 반려 실패:", e?.message ?? e);
      alert(e?.message ?? "반려 실패");
    } finally {
      setProcessing(false);
    }
  };

  // 체크박스 토글
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRows.map((r) => r.id)));
    }
  };

  const fetchSiteNames = React.useCallback(
    async (siteIds: string[]) => {
      const ids = Array.from(new Set(siteIds.filter(Boolean)));
      if (ids.length === 0) {
        setSiteNameById({});
        return;
      }

      const { data, error } = await supabase.from("sites").select("id, name").in("id", ids);
      if (error) {
        console.warn("[approval] sites name 조회 실패:", error.message);
        return;
      }

      const map: SiteNameMap = {};
      (data ?? []).forEach((s: any) => {
        if (s?.id) map[String(s.id)] = String(s?.name ?? "-");
      });
      setSiteNameById(map);
    },
    [supabase]
  );

  // ✅ 선택된 현장의 pending 목록 조회
  const fetchPending = React.useCallback(async () => {
    if (!selectedSiteId) return;

    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    setPage(1);

    try {
      const { data, error } = await supabase
        .from("users_staff")
        .select("id, kakao_id, name, phone, staff_type, site_id, created_at, hq, team, rank, status, rejected_reason")
        .eq("status", "pending")
        .eq("site_id", selectedSiteId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (data ?? []) as StaffRow[];
      setRows(list);
      await fetchSiteNames(list.map((r) => r.site_id ?? ""));
    } catch (e: any) {
      console.error("[approval] status 기반 pending 조회 실패:", e?.message ?? e);
      setRows([]);
      setSiteNameById({});
      setError(e?.message ?? "승인대기 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchSiteNames, supabase, selectedSiteId]);

  const columns: TableColumn[] = React.useMemo(
    () => [
      {
        key: "checkbox",
        header: "",
        render: (r) => (
          <input
            type="checkbox"
            checked={selectedIds.has(r.id)}
            onChange={() => toggleSelect(r.id)}
            className="h-4 w-4 rounded border-gray-300"
          />
        ),
      },
      {
        key: "site",
        header: "현장명",
        render: (r) => {
          const id = r.site_id ?? "";
          return siteNameById[id] ?? "-";
        },
      },
      { key: "staff_type", header: "직무구분", render: (r) => r.staff_type ?? "-" },
      { key: "name", header: "이름", render: (r) => r.name ?? "-" },
      { key: "hq", header: "본부", render: (r) => r.hq ?? "-" },
      { key: "team", header: "팀", render: (r) => r.team ?? "-" },
      { key: "rank", header: "직급", render: (r) => r.rank ?? "-" },
      {
        key: "actions",
        header: "처리",
        render: (r) => (
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove([r.id])}
              disabled={processing}
              className={adminUi.buttonClass.primarySm}
            >
              승인
            </button>
            <button
              onClick={() => {
                setCurrentTarget({ ids: [r.id], isBulk: false });
                setRejectModalOpen(true);
              }}
              disabled={processing}
              className={adminUi.buttonClass.dangerSm}
            >
              반려
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siteNameById, selectedIds, processing]
  );

  // 페이지네이션 계산
  const totalPages = Math.ceil(rows.length / pageSize);
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const allCurrentPageSelected = paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id));

  return (
    <AdminPageShell
      title="승인관리"
      description="승인 대기중인 직원 목록"
      actions={
        <button
          className={adminUi.buttonClass.secondary}
          onClick={fetchPending}
          disabled={loading}
          type="button"
        >
          {loading ? "불러오는 중..." : "새로고침"}
        </button>
      }
    >
      {/* 토스트 */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg">
          {toast}
        </div>
      )}

      {/* 반려 모달 */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            {/* 헤더 */}
            <div className="flex items-center justify-between bg-gradient-to-r from-red-500 to-red-600 px-5 py-4">
              <h3 className="text-base font-bold text-white">반려 사유 입력</h3>
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason("");
                  setCurrentTarget(null);
                }}
                className="rounded-md bg-white/15 px-2 py-1 text-sm font-semibold text-white hover:bg-white/25 transition"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {/* 바디 */}
            <div className="max-h-[65vh] overflow-y-auto p-5 space-y-3">
              <p className="text-sm text-gray-600">
                반려 사유를 입력하면 해당 신청은 <span className="font-semibold text-gray-900">rejected</span> 상태로
                변경됩니다.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="예) 서류 누락 / 사진 식별 불가 / 정보 불일치 등"
                className={[adminUi.inputClass(), "min-h-[140px] resize-none"].join(" ")}
              />
            </div>

            {/* 푸터 */}
            <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setRejectModalOpen(false);
                  setRejectReason("");
                  setCurrentTarget(null);
                }}
                className={adminUi.buttonClass.secondary}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (currentTarget && rejectReason.trim()) {
                    handleReject(currentTarget.ids, rejectReason);
                  }
                }}
                disabled={!rejectReason.trim() || processing}
                className={adminUi.buttonClass.danger}
              >
                반려 확정
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {/* 현장 선택 버튼 그리드 */}
      <div className={`${adminUi.card} mb-6`}>
        <h2 className="mb-3 text-sm font-medium text-gray-700">현장 선택</h2>
        <div className="grid grid-cols-5 gap-3">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                selectedSiteId === site.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {site.name}
            </button>
          ))}
        </div>
      </div>

      {/* 일괄처리 버튼 */}
      {rows.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleApprove(Array.from(selectedIds))}
            disabled={selectedIds.size === 0 || processing}
            className={adminUi.buttonClass.primary}
          >
            일괄승인 ({selectedIds.size})
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedIds.size > 0) {
                setCurrentTarget({ ids: Array.from(selectedIds), isBulk: true });
                setRejectModalOpen(true);
              }
            }}
            disabled={selectedIds.size === 0 || processing}
            className={adminUi.buttonClass.danger}
          >
            일괄반려 ({selectedIds.size})
          </button>
        </div>
      )}

      <div className={adminUi.card}>
        <div className={adminUi.cardTopBar}>
          <div className="text-sm font-semibold text-gray-600">
            승인대기: <span className="font-semibold text-gray-900">{rows.length}</span>명
          </div>
        </div>

        {loading ? <div className="p-6 text-sm text-gray-500">로딩 중...</div> : null}

        {!loading && rows.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">승인 대기중인 직원이 없습니다.</div>
        ) : null}

        {!loading && paginatedRows.length > 0 ? (
          <div className={adminUi.tableWrap}>
            <table className={adminUi.table}>
              <thead>
                <tr className={adminUi.theadRow}>
                  <th className={adminUi.th}>
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </th>
                  {columns.slice(1).map((c) => (
                    <th key={c.key} className={adminUi.th}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className={adminUi.tbody}>
                {paginatedRows.map((r) => (
                  <tr key={r.id} className={adminUi.tr}>
                    {columns.map((c) => (
                      <td key={c.key} className={adminUi.td}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className={adminUi.buttonClass.secondary}
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={adminUi.buttonClass.secondary}
          >
            다음
          </button>
        </div>
      )}
    </AdminPageShell>
  );
}