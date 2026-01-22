"use client";

import { useEffect, useMemo, useState } from "react";
import AdminPageShell from "@/components/AdminPageShell";
import { adminUi } from "../../../src/styles/adminUi";

type AdminCode = "A" | "B" | "C" | "O";

type AdminRow = {
  uuid: string;
  user_id: string;
  name: string;
  code: AdminCode;
  code_label: string;
  status: string; // "active" | "inactive" 등
  auth_uid: string | null;
  site_summary: string;
  sites: { id: string; name: string; role: string | null }[];
};

type SiteRow = {
  id: string;
  name: string;
  status?: string | null;
};

type CreateBody = {
  user_id: string;
  password: string;
  name: string;
  code: AdminCode;
  site_ids?: string[];
};

type UpdateBody = {
  admin_uuid: string;
  name?: string;
  code?: AdminCode;
  password?: string;
  site_ids?: string[];
};

function displayUserId(raw?: string) {
  if (!raw) return "";
  return raw.includes("@") ? raw.split("@")[0] : raw;
}

function codeLabelLocal(code: AdminCode) {
  switch (code) {
    case "A":
      return "Code Alpha";
    case "B":
      return "Code Bravo";
    case "C":
      return "Code Charlie";
    case "O":
      return "Code Oscar";
  }
}

function isCO(code: AdminCode) {
  return code === "C" || code === "O";
}

function normalizeSiteIds(raw: string) {
  const parts = raw
    .split(/[\s,]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

export default function AdminClient() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // sites (현장 목록)
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [sitesError, setSitesError] = useState("");

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createUserId, setCreateUserId] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState<AdminCode>("C");
  const [createSiteIds, setCreateSiteIds] = useState<string[]>([]);
  const [createManualSiteIds, setCreateManualSiteIds] = useState("");

  // edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [editTarget, setEditTarget] = useState<AdminRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState<AdminCode>("C");
  const [editPassword, setEditPassword] = useState("");
  const [editSiteIds, setEditSiteIds] = useState<string[]>([]);
  const [editManualSiteIds, setEditManualSiteIds] = useState("");

  const totalCountLabel = useMemo(() => `총 ${rows.length}명`, [rows.length]);

  async function loadAdmins() {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load admins (${res.status}) ${text}`);
      }

      const json = (await res.json()) as { data: AdminRow[] };
      setRows(json.data ?? []);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function loadSites() {
    setSitesError("");
    try {
      const res = await fetch("/api/admin/sites", {
        method: "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to load sites (${res.status}) ${text}`);
      }

      const json = (await res.json()) as { data: SiteRow[] };
      setSites(json.data ?? []);
    } catch (e: any) {
      setSites([]);
      setSitesError(e?.message ?? "현장 목록을 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    loadAdmins();
    loadSites();
  }, []);

  // ---------- create ----------
  function openCreateModal() {
    setCreateError("");
    setCreateSubmitting(false);
    setCreateUserId("");
    setCreatePassword("");
    setCreateName("");
    setCreateCode("C");
    setCreateSiteIds([]);
    setCreateManualSiteIds("");
    setCreateOpen(true);
  }

  function closeCreateModal() {
    if (createSubmitting) return;
    setCreateOpen(false);
  }

  function toggleCreateSiteId(siteId: string) {
    setCreateSiteIds((prev) => {
      if (prev.includes(siteId)) return prev.filter((x) => x !== siteId);
      return [...prev, siteId];
    });
  }

  async function submitCreate() {
    setCreateError("");

    const user_id = createUserId.trim();
    const password = createPassword;
    const name = createName.trim();
    const code = createCode;

    if (!user_id) return setCreateError("아이디(user_id)를 입력하세요.");
    if (user_id.includes("@")) return setCreateError("@ 없이 아이디만 입력하세요.");
    if (!password) return setCreateError("비밀번호를 입력하세요.");
    if (password.length < 6) return setCreateError("비밀번호는 6자 이상으로 입력하세요.");
    if (!name) return setCreateError("성명을 입력하세요.");

    let site_ids: string[] | undefined = undefined;
    if (isCO(code)) {
      site_ids = sites.length > 0 ? createSiteIds : normalizeSiteIds(createManualSiteIds);
      if (!site_ids || site_ids.length === 0) {
        return setCreateError("C/O 권한은 담당 현장을 1개 이상 선택/입력해야 합니다.");
      }
    }

    const payload: CreateBody = {
      user_id,
      password,
      name,
      code,
      ...(isCO(code) ? { site_ids } : {}),
    };

    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`생성 실패 (${res.status}) ${text}`);
      }

      setCreateOpen(false);
      await loadAdmins();
    } catch (e: any) {
      setCreateError(e?.message ?? "생성 실패");
    } finally {
      setCreateSubmitting(false);
    }
  }

  // ---------- edit ----------
  function openEditModal(r: AdminRow) {
    setEditError("");
    setEditSubmitting(false);
    setEditTarget(r);
    setEditName(r.name ?? "");
    setEditCode(r.code);
    setEditPassword("");
    const ids = (r.sites ?? []).map((s) => s.id);
    setEditSiteIds(ids);
    setEditManualSiteIds(ids.join(","));
    setEditOpen(true);
  }

  function closeEditModal() {
    if (editSubmitting) return;
    setEditOpen(false);
  }

  function toggleEditSiteId(siteId: string) {
    setEditSiteIds((prev) => {
      if (prev.includes(siteId)) return prev.filter((x) => x !== siteId);
      return [...prev, siteId];
    });
  }

  async function submitEdit() {
    if (!editTarget) return;

    setEditError("");

    const admin_uuid = editTarget.uuid;
    const name = editName.trim();
    const code = editCode;
    const password = editPassword;

    if (!name) return setEditError("성명을 입력하세요.");
    if (password && password.length < 6) return setEditError("비밀번호 변경 시 6자 이상으로 입력하세요.");

    let site_ids: string[] = [];
    if (isCO(code)) {
      site_ids = sites.length > 0 ? editSiteIds : normalizeSiteIds(editManualSiteIds);
      if (site_ids.length === 0) {
        return setEditError("C/O 권한은 담당 현장을 1개 이상 선택/입력해야 합니다.");
      }
    }

    const payload: UpdateBody = {
      admin_uuid,
      name,
      code,
      ...(password ? { password } : {}),
      ...(isCO(code) ? { site_ids } : { site_ids: [] }), // A/B면 매핑 제거
    };

    setEditSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`수정 실패 (${res.status}) ${text}`);
      }

      setEditOpen(false);
      await loadAdmins();
    } catch (e: any) {
      setEditError(e?.message ?? "수정 실패");
    } finally {
      setEditSubmitting(false);
    }
  }

  // ---------- delete (soft delete) ----------
  async function submitDelete(r: AdminRow) {
    const ok = window.confirm(`${displayUserId(r.user_id)} (${r.name}) 계정을 비활성화(삭제)할까?`);
    if (!ok) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_uuid: r.uuid }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`삭제 실패 (${res.status}) ${text}`);
      }

      await loadAdmins();
    } catch (e: any) {
      window.alert(e?.message ?? "삭제 실패");
    }
  }

  return (
    <AdminPageShell
      title="관리자 계정 설정"
      description="관리자 계정(생성/수정/삭제) 및 현장 매핑을 관리합니다."
      actions={
        <div className="flex flex-col items-end gap-2">
          <button type="button" className={adminUi.buttonClass.primary} onClick={openCreateModal}>
            관리자 생성
          </button>
          {sitesError ? <div className="text-xs text-red-600 break-all">{sitesError}</div> : null}
        </div>
      }
    >
      {loading ? (
        <div className={adminUi.card}>
          <div className="text-sm text-gray-600">불러오는 중...</div>
        </div>
      ) : errorMsg ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          <div className="font-semibold">목록을 불러오지 못했습니다.</div>
          <div className="mt-2 break-all">{errorMsg}</div>
          <div className="mt-3 text-xs text-red-600">(권한 문제면 A/B 마스터 계정으로 로그인했는지 확인)</div>
        </div>
      ) : (
        <div className={adminUi.card}>
          <div className={adminUi.cardTopBar}>
            <div className="text-xs text-gray-600">{totalCountLabel}</div>
            <button type="button" className={adminUi.buttonClass.secondarySm} onClick={loadAdmins}>
              새로고침
            </button>
          </div>

          <div className={adminUi.tableWrap}>
            <table className={adminUi.table}>
              <thead>
                <tr className={adminUi.theadRow}>
                  <th className={[adminUi.th, "w-[140px]"].join(" ")}>아이디</th>
                  <th className={[adminUi.th, "w-[140px]"].join(" ")}>성명</th>
                  <th className={[adminUi.th, "w-[140px]"].join(" ")}>권한</th>
                  <th className={adminUi.th}>담당현장</th>
                  <th className={[adminUi.th, "w-[120px]"].join(" ")}>상태</th>
                  <th className={[adminUi.th, "w-[150px] text-right"].join(" ")}>관리</th>
                </tr>
              </thead>

              <tbody className={adminUi.tbody}>
                {rows.length === 0 ? (
                  <tr>
                    <td className={adminUi.emptyTd} colSpan={6}>
                      등록된 관리자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.uuid} className={adminUi.tr}>
                      <td className={[adminUi.tdStrong, "w-[140px] whitespace-nowrap truncate"].join(" ")}>
                        {displayUserId(r.user_id)}
                      </td>

                      <td className={[adminUi.td, "w-[140px] whitespace-nowrap truncate"].join(" ")}>{r.name}</td>

                      <td className={[adminUi.td, "w-[140px] whitespace-nowrap truncate"].join(" ")}>
                        <span className="inline-flex max-w-full items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 truncate">
                          {r.code_label?.startsWith("Code ") ? r.code_label : codeLabelLocal(r.code)}
                        </span>
                      </td>

                      <td className={[adminUi.td, "break-words"].join(" ")}>{r.site_summary}</td>

                      <td className={[adminUi.td, "w-[120px] whitespace-nowrap"].join(" ")}>
                        {r.status === "active" ? (
                          <span className={[adminUi.badgeBase, adminUi.badgeActive].join(" ")}>active</span>
                        ) : (
                          <span className={[adminUi.badgeBase, adminUi.badgeInactive].join(" ")}>{r.status}</span>
                        )}
                      </td>

                      <td className={[adminUi.td, "w-[150px]"].join(" ")}>
                        <div className="flex justify-end gap-2">
                          <button type="button" className={adminUi.buttonClass.secondarySm} onClick={() => openEditModal(r)}>
                            수정
                          </button>
                          <button type="button" className={adminUi.buttonClass.dangerSm} onClick={() => submitDelete(r)}>
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
            <div className="text-gray-500">* A/B는 Master, C/O는 현장 매핑 기준으로 표시됩니다.</div>
          </div>
        </div>
      )}

      {/* ---------- Create Modal ---------- */}
      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCreateModal();
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-white">관리자 생성</h2>
                <p className="mt-1 text-xs text-white/90">아이디 / 비밀번호 / 성명 / 권한을 입력해 관리자 계정을 생성합니다.</p>
              </div>

              <button
                type="button"
                className="rounded-md bg-white/15 px-2 py-1 text-sm font-semibold text-white hover:bg-white/25 transition disabled:opacity-50"
                onClick={closeCreateModal}
                disabled={createSubmitting}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {createError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {createError}
                </div>
              ) : null}

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700">아이디 (user_id)</label>
                  <input
                    type="text"
                    className={adminUi.inputClass(createSubmitting)}
                    placeholder="예) honggildong"
                    value={createUserId}
                    onChange={(e) => setCreateUserId(e.target.value.replaceAll("@", ""))}
                    disabled={createSubmitting}
                    autoFocus
                  />
                  <div className="mt-2 text-[11px] text-gray-500">
                    * 아이디만 입력하세요. (<b>@</b> 입력 불가)
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700">비밀번호</label>
                  <input
                    type="password"
                    className={adminUi.inputClass(createSubmitting)}
                    placeholder="6자 이상"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    disabled={createSubmitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-gray-700">성명</label>
                    <input
                      type="text"
                      className={adminUi.inputClass(createSubmitting)}
                      placeholder="예) 홍길동"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      disabled={createSubmitting}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-gray-700">권한</label>
                    <select
                      className={adminUi.inputClass(createSubmitting)}
                      value={createCode}
                      onChange={(e) => {
                        const next = e.target.value as AdminCode;
                        setCreateCode(next);
                        setCreateSiteIds([]);
                        setCreateManualSiteIds("");
                      }}
                      disabled={createSubmitting}
                    >
                      <option value="A">Code Alpha</option>
                      <option value="B">Code Bravo</option>
                      <option value="C">Code Charlie</option>
                      <option value="O">Code Oscar</option>
                    </select>
                  </div>
                </div>

                {isCO(createCode) ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-bold text-gray-900">담당 현장 매핑</div>
                    <div className="mt-1 text-xs text-gray-500">C/O 권한은 담당 현장을 1개 이상 선택/입력해야 합니다.</div>

                    {sites.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {sites.map((s) => {
                          const checked = createSiteIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-blue-50/30 transition"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCreateSiteId(s.id)}
                                disabled={createSubmitting}
                              />
                              <span className="min-w-0 truncate">{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="text-xs text-gray-500">
                          현장 목록을 불러오지 못했습니다. 아래에 <b>site_id</b>를 콤마로 입력하세요.
                        </div>
                        <input
                          type="text"
                          className={["mt-3", adminUi.inputClass(createSubmitting)].join(" ")}
                          placeholder="예) 1111-uuid, 2222-uuid"
                          value={createManualSiteIds}
                          onChange={(e) => setCreateManualSiteIds(e.target.value)}
                          disabled={createSubmitting}
                        />
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                className={adminUi.buttonClass.secondary}
                onClick={closeCreateModal}
                disabled={createSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                className={adminUi.buttonClass.primary}
                onClick={submitCreate}
                disabled={createSubmitting}
              >
                {createSubmitting ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- Edit Modal ---------- */}
      {editOpen && editTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white">관리자 수정</h2>
                <p className="mt-1 text-xs text-white/90 break-all">
                  {displayUserId(editTarget.user_id)} ({editTarget.user_id})
                </p>
              </div>

              <button
                type="button"
                className="rounded-md bg-white/15 px-2 py-1 text-sm font-semibold text-white hover:bg-white/25 transition disabled:opacity-50"
                onClick={closeEditModal}
                disabled={editSubmitting}
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {editError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                  {editError}
                </div>
              ) : null}

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-gray-700">성명</label>
                    <input
                      type="text"
                      className={adminUi.inputClass(editSubmitting)}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={editSubmitting}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-gray-700">권한</label>
                    <select
                      className={adminUi.inputClass(editSubmitting)}
                      value={editCode}
                      onChange={(e) => {
                        const next = e.target.value as AdminCode;
                        setEditCode(next);
                        if (!isCO(next)) {
                          setEditSiteIds([]);
                          setEditManualSiteIds("");
                        }
                      }}
                      disabled={editSubmitting}
                    >
                      <option value="A">Code Alpha</option>
                      <option value="B">Code Bravo</option>
                      <option value="C">Code Charlie</option>
                      <option value="O">Code Oscar</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-gray-700">비밀번호 변경 (선택)</label>
                  <input
                    type="password"
                    className={adminUi.inputClass(editSubmitting)}
                    placeholder="변경할 때만 입력 (6자 이상)"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    disabled={editSubmitting}
                  />
                </div>

                {isCO(editCode) ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-bold text-gray-900">담당 현장 매핑</div>
                    <div className="mt-1 text-xs text-gray-500">C/O 권한은 담당 현장을 1개 이상 선택/입력해야 합니다.</div>

                    {sites.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {sites.map((s) => {
                          const checked = editSiteIds.includes(s.id);
                          return (
                            <label
                              key={s.id}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-blue-50/30 transition"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleEditSiteId(s.id)}
                                disabled={editSubmitting}
                              />
                              <span className="min-w-0 truncate">{s.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="text-xs text-gray-500">
                          현장 목록을 불러오지 못했습니다. 아래에 <b>site_id</b>를 콤마로 입력하세요.
                        </div>
                        <input
                          type="text"
                          className={["mt-3", adminUi.inputClass(editSubmitting)].join(" ")}
                          placeholder="예) 1111-uuid, 2222-uuid"
                          value={editManualSiteIds}
                          onChange={(e) => setEditManualSiteIds(e.target.value)}
                          disabled={editSubmitting}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-700">
                    A/B 권한은 Master이므로 현장 매핑을 사용하지 않습니다. (저장 시 기존 매핑은 제거됩니다)
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                className={adminUi.buttonClass.secondary}
                onClick={closeEditModal}
                disabled={editSubmitting}
              >
                취소
              </button>
              <button
                type="button"
                className={adminUi.buttonClass.primary}
                onClick={submitEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
