"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseAppClient } from "@apex/config";
import MapModal from "@/components/MapModal";
import AdminPageShell from "@/components/AdminPageShell";
import { adminUi } from "@apex/ui/styles/admin";

type Site = {
  id: string;
  code: string | null;
  name: string | null;
  status: string | null;
  product_type: string | null;
  address1: string | null;
  address2: string | null;
  announcement_date: string | null;
  lat: number | null;
  lng: number | null;
  checkin_radius_m: number | null;
  checkin_start_time: string | null;
  checkin_end_time: string | null;
  visit_type: boolean | null;
  created_at: string;
  updated_at: string;
};

type VisitKind = "" | "데스크" | "조직인포";

type UnitRow = {
  id: string;
  unit_type: string;
  total_units: string;
  note: string;
};

type SiteForm = {
  code: string;
  name: string;
  status: string;
  product_type: string;
  address1: string;
  address2: string;
  announcement_date: string;
  visit_kind: VisitKind; // ✅ UI 전용
  lat: string;
  lng: string;
  checkin_radius_m: number;
  checkin_start_time: string;
  checkin_end_time: string;
};

const emptyForm: SiteForm = {
  code: "",
  name: "",
  status: "활성",
  product_type: "",
  address1: "",
  address2: "",
  announcement_date: "",
  visit_kind: "데스크",
  lat: "",
  lng: "",
  checkin_radius_m: 50,
  checkin_start_time: "",
  checkin_end_time: "",
};

const PRODUCT_TYPES = ["아파트", "오피스텔", "상업시설", "주상복합", "지식산업센터", "기타"];
const STATUS_OPTIONS = ["활성", "비활성"];

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-bold text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </div>
      {children}
    </label>
  );
}

function Divider() {
  return <div className="col-span-full my-3 border-t border-gray-200" />;
}

export default function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<SiteForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  // ✅ 타입 구성(표) UI 상태
  const newUnitRow = (): UnitRow => ({
    id: `row_${Math.random().toString(16).slice(2)}`,
    unit_type: "",
    total_units: "",
    note: "",
  });
  const [unitRows, setUnitRows] = useState<UnitRow[]>([newUnitRow()]);

  const sidoReqIdRef = useRef(0);
  const sigunguReqIdRef = useRef(0);

  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [sidoList, setSidoList] = useState<string[]>([]);
  const [sigunguList, setSigunguList] = useState<string[]>([]);

  const sigunguCacheRef = useRef<Map<string, string[]>>(new Map());
  const [addrLoading, setAddrLoading] = useState<{ sido: boolean; sigungu: boolean }>({
    sido: false,
    sigungu: false,
  });

  const [sigunguOpen, setSigunguOpen] = useState(false);

  // 지도 모달 상태
  const [mapModalOpen, setMapModalOpen] = useState(false);

  // 반경 슬라이더는 "드래그 중 리렌더 0"
  const radiusSliderRef = useRef<HTMLInputElement | null>(null);
  const radiusNumberRef = useRef<HTMLInputElement | null>(null);
  const radiusValueRef = useRef<HTMLSpanElement | null>(null);

  const clampRadius = (n: number) => Math.max(1, Math.min(100, n));

  // 모달 열릴 때 / 편집 대상 바뀔 때: 현재 form 값으로 슬라이더 DOM을 동기화
  useEffect(() => {
    if (!open) return;
    const v = clampRadius(form.checkin_radius_m || 50);
    if (radiusSliderRef.current) radiusSliderRef.current.value = String(v);
    if (radiusNumberRef.current) radiusNumberRef.current.value = String(v);
    if (radiusValueRef.current) radiusValueRef.current.textContent = `${v}m`;
  }, [open, editingId, form.checkin_radius_m]);

  function handleRadiusInput(raw: string) {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return;
    const v = clampRadius(parsed);
    // 여기서는 state 업데이트 금지(리렌더 0)
    if (radiusNumberRef.current) radiusNumberRef.current.value = String(v);
    if (radiusValueRef.current) radiusValueRef.current.textContent = `${v}m`;
  }

  function commitRadiusFromValue(raw: string) {
    const parsed = parseInt(raw, 10);
    const v = clampRadius(Number.isFinite(parsed) ? parsed : 50);
    setField("checkin_radius_m", v);
  }

  const columns = useMemo(
    () => [
      { key: "name", label: "현장명" },
      { key: "product_type", label: "상품구분" },
      { key: "address1", label: "위치" },
      { key: "status", label: "상태" },
      { key: "actions", label: "관리" },
    ],
    []
  );

  const supabase = supabaseAppClient();

  async function loadSidoList() {
    const reqId = ++sidoReqIdRef.current;
    setAddrLoading((p) => ({ ...p, sido: true }));

    const { data, error } = await supabase.from("sido_list").select("sido").order("sido", {
      ascending: true,
    });

    if (reqId !== sidoReqIdRef.current) return;
    setAddrLoading((p) => ({ ...p, sido: false }));

    if (error) {
      setError(`주소 데이터 로드 실패: ${error.message}`);
      return;
    }

    const list = (data ?? []).map((x: any) => x.sido).filter(Boolean) as string[];
    setSidoList(list);
  }

  async function loadSigunguList(sido: string) {
    const reqId = ++sigunguReqIdRef.current;
    if (!sido) {
      setSigunguList([]);
      return;
    }

    const cached = sigunguCacheRef.current.get(sido);
    if (cached && cached.length) {
      setSigunguList(cached);
      return;
    }

    setAddrLoading((p) => ({ ...p, sigungu: true }));
    const { data, error } = await supabase
      .from("sigungu_list")
      .select("sigungu")
      .eq("sido", sido)
      .order("sigungu", { ascending: true });

    if (reqId !== sigunguReqIdRef.current) return;
    setAddrLoading((p) => ({ ...p, sigungu: false }));

    if (error) {
      console.error("시군구 로드 에러:", error);
      return;
    }

    const list = (data ?? []).map((x: any) => x.sigungu).filter(Boolean) as string[];
    sigunguCacheRef.current.set(sido, list);
    setSigunguList(list);
  }

  function setField<K extends keyof SiteForm>(k: K, v: SiteForm[K]) {
    setForm((p) => {
      const updated = { ...p, [k]: v };
      if (k === "address1") {
        updated.address2 = "";
        setSigunguList([]);
      }
      return updated;
    });
  }

  function addUnitRow() {
    setUnitRows((prev) => [...prev, newUnitRow()]);
  }

  function removeUnitRow(id: string) {
    setUnitRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  function updateUnitRow(id: string, key: keyof Omit<UnitRow, "id">, value: string) {
    setUnitRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }

  async function loadSites() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from("sites").select("*").order("created_at", {
      ascending: false,
    });

    if (error) setError(error.message);
    setSites((data ?? []) as Site[]);
    setLoading(false);
  }

  useEffect(() => {
    loadSites();
    loadSidoList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!form.address1) {
      setSigunguList([]);
      return;
    }
    loadSigunguList(form.address1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.address1]);

  function toNumberOrNull(v?: string | null) {
    const t = (v ?? "").trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  function toIntOrNull(v?: string | null) {
    const t = (v ?? "").trim();
    if (!t) return null;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }

  function buildUnitsPayload(siteId: string) {
    return unitRows
      .map((r) => ({
        site_id: siteId,
        unit_type: (r.unit_type ?? "").trim(),
        unit_amount: toIntOrNull(r.total_units),
        memo: (r.note ?? "").trim() || null,
      }))
      .filter((x) => x.unit_type && x.unit_amount !== null);
  }

  async function loadUnits(siteId: string) {
    if (!siteId) return;
    const { data, error } = await supabase
      .from("sites_units")
      .select("unit_type, unit_amount, memo")
      .eq("site_id", siteId);

    if (error) {
      // 유닛 로드는 실패해도 모달은 열리게 둠
      console.error("sites_units 로드 실패:", error);
      return;
    }

    const rows = (data ?? []).map((u: any) => ({
      id: `row_${Math.random().toString(16).slice(2)}`,
      unit_type: u.unit_type ?? "",
      total_units: u.unit_amount !== null && u.unit_amount !== undefined ? String(u.unit_amount) : "",
      note: u.memo ?? "",
    })) as UnitRow[];

    setUnitRows(rows.length ? rows : [newUnitRow()]);
  }

  async function saveSite() {
    setSaving(true);
    setError(null);

    const code = (form?.code ?? "").trim();
    const name = (form?.name ?? "").trim();
    const status = (form?.status ?? "").trim();

    if (!code || !name || !status) {
      setError("코드/현장명/상태는 필수야.");
      setSaving(false);
      return;
    }

    const payload = {
      code,
      name,
      status,
      product_type: (form?.product_type ?? "").trim() || null,
      address1: (form?.address1 ?? "").trim() || null,
      address2: (form?.address2 ?? "").trim() || null,
      announcement_date: form?.announcement_date || null,

      // ✅ 방문구분: 데스크=false(0), 조직인포=true(1)
      visit_type: form.visit_kind === "조직인포",

      lat: toNumberOrNull(form?.lat),
      lng: toNumberOrNull(form?.lng),
      checkin_radius_m: form?.checkin_radius_m ?? 50,
      checkin_start_time: form?.checkin_start_time ? `${form.checkin_start_time}:00` : null,
      checkin_end_time: form?.checkin_end_time ? `${form.checkin_end_time}:00` : null,
    };

    let siteId = editingId;

    // 1) sites 저장
    if (editingId) {
      const { error: updateError } = await supabase.from("sites").update(payload).eq("id", editingId);
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("sites")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setSaving(false);
        return;
      }

      siteId = data?.id ?? null;
    }

    if (!siteId) {
      setError("현장 ID를 확보하지 못했습니다.");
      setSaving(false);
      return;
    }

    // 2) sites_units 저장 (기존 삭제 후 재입력)
    if (editingId) {
      const { error: delError } = await supabase.from("sites_units").delete().eq("site_id", siteId);
      if (delError) {
        setError(delError.message);
        setSaving(false);
        return;
      }
    }

    const unitsPayload = buildUnitsPayload(siteId);

    if (unitsPayload.length > 0) {
      const { error: unitInsError } = await supabase.from("sites_units").insert(unitsPayload);
      if (unitInsError) {
        setError(unitInsError.message);
        setSaving(false);
        return;
      }
    }

    setOpen(false);
    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    await loadSites();
  }

  function openCreateModal() {
    setError(null);
    setForm(emptyForm);
    setUnitRows([newUnitRow()]);
    setEditingId(null);
    setSigunguList([]);
    setSigunguOpen(false);
    setOpen(true);
  }

  function openEditModal(site: Site) {
    setError(null);
    setUnitRows([newUnitRow()]);
    const formData: SiteForm = {
      code: site.code || "",
      name: site.name || "",
      status: site.status || "활성",
      product_type: site.product_type || "",
      address1: site.address1 || "",
      address2: site.address2 || "",
      announcement_date: site.announcement_date || "",
      visit_kind: site.visit_type ? "조직인포" : "데스크",
      lat: site.lat?.toString() || "",
      lng: site.lng?.toString() || "",
      checkin_radius_m: site.checkin_radius_m || 50,
      checkin_start_time: site.checkin_start_time?.slice(0, 5) || "",
      checkin_end_time: site.checkin_end_time?.slice(0, 5) || "",
    };
    setForm(formData);
    setEditingId(site.id);
    setSigunguOpen(false);
    setOpen(true);
    loadUnits(site.id);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditingId(null);
    setSigunguOpen(false);
  }

  function openDeleteModal(siteId: string) {
    setDeleteTarget(siteId);
    setDeletePassword("");
    setDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteModal(false);
    setDeleteTarget(null);
    setDeletePassword("");
    setError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget || !deletePassword.trim()) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    setDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase.from("sites").delete().eq("id", deleteTarget);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
      return;
    }

    setDeleting(false);
    closeDeleteModal();
    await loadSites();
  }

  return (
    <AdminPageShell
      title="현장 설정"
      description="현장 목록을 확인하고 관리할 수 있습니다"
      actions={
        <button type="button" onClick={openCreateModal} className={adminUi.buttonClass.primary}>
          <span className="mr-1.5">+</span>
          현장 추가
        </button>
      }
    >
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className={adminUi.card}>
        <div className={adminUi.cardTopBar}>
          <div className="text-sm font-semibold text-gray-600">
            {loading ? "불러오는 중..." : `총 ${sites.length}개의 현장`}
          </div>
          <button
            type="button"
            onClick={loadSites}
            disabled={loading}
            className={adminUi.buttonClass.secondary}
          >
            새로고침
          </button>
        </div>

        <div className={adminUi.tableWrap}>
          <table className={adminUi.table}>
            <thead>
              <tr className={adminUi.theadRow}>
                {columns.map((c) => (
                  <th key={c.key} className={adminUi.th}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={adminUi.tbody}>
              {!loading && sites.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className={adminUi.emptyTd}>
                    등록된 현장이 없습니다. 상단 "현장 추가" 버튼을 눌러 추가해주세요.
                  </td>
                </tr>
              )}
              {sites.map((s) => (
                <tr key={s.id} className={adminUi.tr}>
                  <td className={adminUi.tdStrong}>{s.name ?? ""}</td>
                  <td className={adminUi.td}>{s.product_type ?? ""}</td>
                  <td className={adminUi.td}>
                    {s.address1 ? `${s.address1} ${s.address2 || ""}`.trim() : ""}
                  </td>
                  <td className={adminUi.td}>
                    <span
                      className={`${adminUi.badgeBase} ${
                        s.status === "활성" ? adminUi.badgeActive : adminUi.badgeInactive
                      }`}
                    >
                      {s.status ?? ""}
                    </span>
                  </td>
                  <td className={adminUi.td}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className={adminUi.buttonClass.primarySm}
                      >
                        수정
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(s.id)}
                        className={adminUi.buttonClass.dangerSm}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={closeModal}
        >
          <div
            className="w-full max-w-[1000px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold text-white">{editingId ? "현장 수정" : "현장 추가"}</div>
                  <div className="mt-1 text-sm text-blue-100">필수 항목을 입력하고 저장해주세요</div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="코드" required>
                  <input
                    value={form.code}
                    onChange={(e) => setField("code", e.target.value)}
                    className={adminUi.inputClass()}
                    placeholder="현장 코드 입력"
                  />
                </Field>

                <Field label="현장명" required>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={adminUi.inputClass()}
                    placeholder="현장명 입력"
                  />
                </Field>

                <Field label="상태" required>
                  <select
                    value={form.status}
                    onChange={(e) => setField("status", e.target.value)}
                    className={adminUi.inputClass()}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="상품구분">
                  <select
                    value={form.product_type}
                    onChange={(e) => setField("product_type", e.target.value)}
                    className={adminUi.inputClass()}
                  >
                    <option value="">선택하세요</option>
                    {PRODUCT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`시/도${addrLoading.sido ? " (로딩...)" : ""}`}>
                  <select
                    value={form.address1}
                    onChange={(e) => setField("address1", e.target.value)}
                    className={adminUi.inputClass()}
                  >
                    <option value="">선택하세요</option>
                    {sidoList.map((sido) => (
                      <option key={sido} value={sido}>
                        {sido}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`시군구${addrLoading.sigungu ? " (로딩...)" : ""}`}>
                  <select
                    value={form.address2}
                    onChange={(e) => setField("address2", e.target.value)}
                    onFocus={() => setSigunguOpen(true)}
                    onBlur={() => setSigunguOpen(false)}
                    className={adminUi.inputClass(!form.address1)}
                    disabled={!form.address1}
                  >
                    <option value="">선택하세요</option>
                    {sigunguOpen &&
                      sigunguList.map((sigungu) => (
                        <option key={sigungu} value={sigungu}>
                          {sigungu}
                        </option>
                      ))}
                  </select>
                </Field>

                <Divider />

                {/* ✅ 방문구분(데스크/조직인포) + 모집공고일: 같은 높이(py-2.5) */}
                <div className="col-span-full">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="방문구분">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setField("visit_kind", "데스크")}
                          className={[
                            "w-full",
                            adminUi.buttonClass.secondary,
                            form.visit_kind === "데스크"
                              ? "!bg-blue-600 !text-white !border-blue-600 ring-2 ring-blue-200"
                              : "",
                          ].join(" ")}
                        >
                          데스크
                        </button>
                        <button
                          type="button"
                          onClick={() => setField("visit_kind", "조직인포")}
                          className={[
                            "w-full",
                            adminUi.buttonClass.secondary,
                            form.visit_kind === "조직인포"
                              ? "!bg-blue-600 !text-white !border-blue-600 ring-2 ring-blue-200"
                              : "",
                          ].join(" ")}
                        >
                          조직인포
                        </button>
                      </div>
                    </Field>

                    <div className="border-l border-gray-300 pl-4">
                      <Field label="모집공고일">
                        <input
                          type="date"
                          value={form.announcement_date}
                          onChange={(e) => setField("announcement_date", e.target.value)}
                          className={adminUi.inputClass()}
                        />
                      </Field>
                    </div>
                  </div>
                </div>

                <Divider />

                <Field label="위도 (Latitude)">
                  <input
                    value={form.lat}
                    onChange={(e) => setField("lat", e.target.value)}
                    className={adminUi.inputClass()}
                    placeholder="37.5665"
                  />
                </Field>

                <Field label="경도 (Longitude)">
                  <input
                    value={form.lng}
                    onChange={(e) => setField("lng", e.target.value)}
                    className={adminUi.inputClass()}
                    placeholder="126.9780"
                  />
                </Field>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setMapModalOpen(true)}
                    className="w-full rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:from-green-600 hover:to-green-700 transition-all"
                  >
                    지도에서 좌표 선택
                  </button>
                </div>

                <div className="col-span-full">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <Field label="체크인 반경">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">1m</span>
                            <span ref={radiusValueRef} className="text-xs font-semibold text-gray-700">
                              {form.checkin_radius_m || 50}m
                            </span>
                            <span className="text-xs font-semibold text-gray-500">100m</span>
                          </div>

                          <input
                            ref={radiusSliderRef}
                            type="range"
                            min="1"
                            max="100"
                            step="1"
                            defaultValue={form.checkin_radius_m || 50}
                            onInput={(e) => handleRadiusInput((e.target as HTMLInputElement).value)}
                            onMouseUp={(e) => commitRadiusFromValue((e.target as HTMLInputElement).value)}
                            onTouchEnd={(e) => commitRadiusFromValue((e.target as HTMLInputElement).value)}
                            className="w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg appearance-none cursor-pointer"
                          />

                          <input
                            ref={radiusNumberRef}
                            type="number"
                            min="1"
                            max="100"
                            defaultValue={form.checkin_radius_m || 50}
                            onChange={(e) => commitRadiusFromValue(e.target.value)}
                            className={adminUi.inputClass()}
                          />
                        </div>
                      </Field>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="space-y-3">
                        <Field label="체크인 시작시간">
                          <input
                            type="time"
                            value={form.checkin_start_time}
                            onChange={(e) => setField("checkin_start_time", e.target.value)}
                            className={adminUi.inputClass()}
                          />
                        </Field>
                        <Field label="체크인 종료시간">
                          <input
                            type="time"
                            value={form.checkin_end_time}
                            onChange={(e) => setField("checkin_end_time", e.target.value)}
                            className={adminUi.inputClass()}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ 맨 아래: 타입 구성(표) + 행 추가 */}
                <Divider />

                <div className="col-span-full">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-xs font-bold text-gray-700">타입 구성</div>
                    <button type="button" onClick={addUnitRow} className={adminUi.buttonClass.secondarySm}>
                      + 추가
                    </button>
                  </div>

                  <div className={adminUi.tableWrap}>
                    <table className={adminUi.table}>
                      <thead>
                        <tr className={adminUi.theadRow}>
                          <th className={adminUi.th}>타입</th>
                          <th className={adminUi.th}>전체세대수</th>
                          <th className={adminUi.th}>비고</th>
                          <th className={adminUi.th} style={{ width: 80 }}>
                            삭제
                          </th>
                        </tr>
                      </thead>
                      <tbody className={adminUi.tbody}>
                        {unitRows.map((r, idx) => (
                          <tr key={r.id} className={`${adminUi.tr} !py-0`}>
                            <td className={`${adminUi.td} !py-1 ${idx === 0 ? '!pt-4' : ''} ${idx === unitRows.length - 1 ? '!pb-4' : ''}`}>
                              <input
                                value={r.unit_type}
                                onChange={(e) => updateUnitRow(r.id, "unit_type", e.target.value)}
                                className={`${adminUi.inputClass()} h-8 py-1 text-sm`}
                                placeholder="예: 84A"
                              />
                            </td>
                            <td className={`${adminUi.td} !py-1 ${idx === 0 ? '!pt-4' : ''} ${idx === unitRows.length - 1 ? '!pb-4' : ''}`}>
                              <input
                                value={r.total_units}
                                onChange={(e) => updateUnitRow(r.id, "total_units", e.target.value)}
                                className={`${adminUi.inputClass()} h-8 py-1 text-sm`}
                                placeholder="예: 120"
                              />
                            </td>
                            <td className={`${adminUi.td} !py-1 ${idx === 0 ? '!pt-4' : ''} ${idx === unitRows.length - 1 ? '!pb-4' : ''}`}>
                              <input
                                value={r.note}
                                onChange={(e) => updateUnitRow(r.id, "note", e.target.value)}
                                className={`${adminUi.inputClass()} h-8 py-1 text-sm`}
                                placeholder="선택"
                              />
                            </td>
                            <td className={`${adminUi.td} !py-1 ${idx === 0 ? '!pt-4' : ''} ${idx === unitRows.length - 1 ? '!pb-4' : ''}`}>
                              <button
                                type="button"
                                onClick={() => removeUnitRow(r.id)}
                                className={adminUi.buttonClass.dangerSm}
                                disabled={unitRows.length <= 1}
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className={adminUi.buttonClass.secondary}
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveSite}
                disabled={saving}
                className={adminUi.buttonClass.primary}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={closeDeleteModal}
        >
          <div
            className="w-full max-w-[450px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="text-lg font-bold text-white">현장 삭제 확인</div>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
              <Field label="관리자 비밀번호 입력" required>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className={adminUi.inputClass()}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className={adminUi.buttonClass.secondary}
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className={adminUi.buttonClass.danger}
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 지도 모달 */}
      <MapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        onSelectCoords={(lat, lng) => {
          setField("lat", lat.toFixed(6));
          setField("lng", lng.toFixed(6));
        }}
        initialLat={form.lat ? parseFloat(form.lat) : 37.5665}
        initialLng={form.lng ? parseFloat(form.lng) : 126.978}
      />
    </AdminPageShell>
  );
}