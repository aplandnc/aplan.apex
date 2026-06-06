"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

// ── 타입 ──
interface SiteInfo { id: string; name: string; }
interface ReservedVisitor {
  id: string; guest_name: string; phone: string; phone_index: string;
  visit_plan: string; memo: string | null; user_id: string;
  staff_name?: string; staff_hq?: string | null; staff_team?: string | null; staff_rank?: string | null;
  created_at?: string;
}
interface VisitRecord {
  id: string; guest_name: string; phone: string; phone_index: string;
  visit_date: string; visit_type: string; visit_cnt: number; staff_uuid: string | null;
  staff_name?: string; staff_hq?: string | null; staff_team?: string | null; staff_rank?: string | null;
  created_at?: string;
}
interface StaffInfo {
  id: string; hq: string | null; team: string | null; name: string; rank: string | null;
  sales_name: string | null; phone: string | null; phone_index: string | null; display_name: string;
}
interface StaffOption {
  id: string; display_name: string; hq: string | null; team: string | null;
  rank: string | null; phone: string | null; phone_index: string | null;
}
interface CarSearchResult {
  id: string; hq: string | null; team: string | null; name: string; rank: string | null;
  car_model: string | null; car_color: string | null; car_number: string | null;
}

// ── 상수 ──
const HQ_OPTIONS = Array.from({ length: 11 }, (_, i) => String(i));
const TEAM_OPTIONS = Array.from({ length: 21 }, (_, i) => String(i));
const TIME_SLOTS = ["~10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00~"];
const RANK_OPTIONS = ["총괄", "팀장", "부장", "차장", "실장", "과장", "대리", "사원", "기타"];
const VISIT_TYPES = ["지명", "워킹", "기타"] as const;
const STAFF_EMOJIS = ["👨", "👩", "🧑", "👨‍💼", "👩‍💼", "🧑‍💼", "👷", "👷‍♀️", "🧑‍🔧", "👨‍🔧", "👩‍🔧", "🧑‍💻", "👨‍💻", "👩‍💻"];
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const getKoreanDate = () => new Date().toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }).slice(0, 10);

const getStaffEmoji = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return STAFF_EMOJIS[Math.abs(hash) % STAFF_EMOJIS.length];
};

const formatPhoneInput = (value: string) => {
  const nums = value.replace(/[^\d]/g, "").slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
};

const formatDateFull = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}(${DAYS[d.getDay()]})`;
};

const formatDateTimeFull = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

const fmtHq = (v?: string | null) => { if (!v) return null; if (/^\d+$/.test(v)) return `${v}본부`; return v.endsWith("본부") ? v : v; };
const fmtTeam = (v?: string | null) => { if (!v) return null; if (/^\d+$/.test(v)) return `${v}팀`; return v.endsWith("팀") ? v : v; };

// 워킹 뱃지: 주황 → 보라
const visitTypeBadge = (type: string) => {
  switch (type) {
    case "지명": return "bg-blue-50 text-blue-600";
    case "워킹": return "bg-violet-50 text-violet-600";
    default: return "bg-gray-100 text-gray-500";
  }
};

const selectClass = "px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_4px_center] bg-no-repeat pr-7 appearance-none";
const selectClassDisabled = "px-2 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%239ca3af%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_4px_center] bg-no-repeat pr-7 appearance-none cursor-not-allowed";

// 라벨 공통 스타일
const labelClass = "text-xs font-semibold text-gray-500";

const INITIAL_FORM = {
  guest_name: "", phone: "", visit_type: "지명", visit_cnt: 1,
  staff_input: "", staff_uuid: null as string | null,
  staff_hq: "", staff_team: "", staff_rank: "",
};

export default function TypeReservedPage() {
  const router = useRouter();
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [reservedList, setReservedList] = useState<ReservedVisitor[]>([]);
  const [visitList, setVisitList] = useState<VisitRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentVisits, setRecentVisits] = useState<VisitRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(INITIAL_FORM);
  const [editStaffOptions, setEditStaffOptions] = useState<StaffOption[]>([]);
  const [showEditStaffDropdown, setShowEditStaffDropdown] = useState(false);
  const [staffKeyword, setStaffKeyword] = useState("");
  const [staffFilterHq, setStaffFilterHq] = useState("");
  const [staffFilterTeam, setStaffFilterTeam] = useState("");
  const [allStaffList, setAllStaffList] = useState<StaffInfo[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [clock, setClock] = useState("");
  const [showCarModal, setShowCarModal] = useState(false);
  const [carSearchKeyword, setCarSearchKeyword] = useState("");
  const [carSearchResults, setCarSearchResults] = useState<CarSearchResult[]>([]);
  const [isCarSearching, setIsCarSearching] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [todayVisits, setTodayVisits] = useState<VisitRecord[]>([]);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const BASE_WIDTH = 1920;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      if (currentWidth < BASE_WIDTH) {
        setScale(currentWidth / BASE_WIDTH);
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("info_site");
    if (raw) { try { setSite(JSON.parse(raw)); } catch { /* */ } }
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(`${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} (${DAYS[now.getDay()]}) ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    };
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!site) return;
    (async () => {
      setIsStaffLoading(true);
      try {
        const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: site.id, keyword: "", type: "staff_all" }) });
        const data = await res.json();
        if (res.ok) setAllStaffList(data.staff || []);
      } catch (err) { console.error(err); }
      finally { setIsStaffLoading(false); }
    })();
  }, [site]);

  const handleLogout = () => {
    sessionStorage.removeItem("info_site");
    document.cookie = "apex-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.replace("/");
  };

  // 차량검색 실시간 조회
  useEffect(() => {
    if (!site || !carSearchKeyword.trim()) {
      setCarSearchResults([]);
      return;
    }
    setIsCarSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/car-search?site_id=${site.id}&car_number=${encodeURIComponent(carSearchKeyword.trim())}`);
        const data = await res.json();
        if (res.ok) setCarSearchResults(data.results || []);
      } catch (err) { console.error(err); }
      finally { setIsCarSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [site, carSearchKeyword]);

  const loadRecentVisits = useCallback(async () => {
    if (!site) return;
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: site.id, keyword: "", type: "recent_visits" }) });
      const data = await res.json();
      if (res.ok) setRecentVisits(data.visits || []);
    } catch (err) { console.error(err); }
  }, [site]);

  useEffect(() => { loadRecentVisits(); }, [loadRecentVisits]);

  const loadTodayVisits = useCallback(async () => {
    if (!site) return;
    try {
      const today = getKoreanDate();
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: site.id, keyword: "", type: "today_visits", date: today }) });
      const data = await res.json();
      if (res.ok) setTodayVisits(data.visits || []);
    } catch (err) { console.error(err); }
  }, [site]);

  useEffect(() => { loadTodayVisits(); }, [loadTodayVisits]);

  const getTimeSlotIndex = (dateStr: string) => {
    const hour = new Date(dateStr).getHours();
    if (hour < 10) return 0;
    if (hour >= 18) return 9;
    return hour - 9;
  };

  const visitStats = useMemo(() => {
    const stats = TIME_SLOTS.map(() => ({ jm_cnt: 0, jm_ppl: 0, wk_cnt: 0, wk_ppl: 0 }));
    todayVisits.forEach((v) => {
      const idx = getTimeSlotIndex(v.created_at || v.visit_date);
      if (v.visit_type === "지명") { stats[idx].jm_cnt++; stats[idx].jm_ppl += v.visit_cnt || 1; }
      else if (v.visit_type === "워킹") { stats[idx].wk_cnt++; stats[idx].wk_ppl += v.visit_cnt || 1; }
    });
    return stats;
  }, [todayVisits]);

  const totalStats = useMemo(() => {
    return visitStats.reduce((acc, s) => ({
      jm_cnt: acc.jm_cnt + s.jm_cnt, jm_ppl: acc.jm_ppl + s.jm_ppl,
      wk_cnt: acc.wk_cnt + s.wk_cnt, wk_ppl: acc.wk_ppl + s.wk_ppl
    }), { jm_cnt: 0, jm_ppl: 0, wk_cnt: 0, wk_ppl: 0 });
  }, [visitStats]);

  const staffHqOptions = useMemo(() => Array.from(new Set(allStaffList.map((s) => s.hq).filter(Boolean) as string[])).sort(), [allStaffList]);
  const staffTeamOptions = useMemo(() => {
    let list = allStaffList;
    if (staffFilterHq) list = list.filter((s) => s.hq === staffFilterHq);
    return Array.from(new Set(list.map((s) => s.team).filter(Boolean) as string[])).sort();
  }, [allStaffList, staffFilterHq]);

  const filteredStaff = useMemo(() => {
    let list = allStaffList;
    if (staffFilterHq) list = list.filter((s) => s.hq === staffFilterHq);
    if (staffFilterTeam) list = list.filter((s) => s.team === staffFilterTeam);
    if (staffKeyword.trim()) {
      const kw = staffKeyword.trim().toLowerCase();
      list = list.filter((s) => s.display_name.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw) || s.phone?.includes(kw) || s.phone_index?.includes(kw));
    }
    return list;
  }, [allStaffList, staffKeyword, staffFilterHq, staffFilterTeam]);

  const handleSearch = useCallback(async () => {
    if (!site || !searchKeyword.trim()) return;
    setIsSearching(true); setReservedList([]); setVisitList([]);
    try {
      const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: site.id, keyword: searchKeyword.trim(), type: "visitor" }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReservedList(data.reserved || []); setVisitList(data.visits || []);
    } catch (err) { console.error(err); }
    finally { setIsSearching(false); }
  }, [site, searchKeyword]);

  const fillFromReserved = (item: ReservedVisitor) => {
    setForm({ guest_name: item.guest_name, phone: item.phone, visit_type: "지명", visit_cnt: 1, staff_input: item.staff_name || "", staff_uuid: item.user_id, staff_hq: item.staff_hq || "", staff_team: item.staff_team || "", staff_rank: item.staff_rank || "" });
    setShowStaffDropdown(false);
  };
  const fillFromVisit = (item: VisitRecord) => {
    setForm({ guest_name: item.guest_name, phone: item.phone, visit_type: "지명", visit_cnt: item.visit_cnt || 1, staff_input: item.staff_name || "", staff_uuid: item.staff_uuid, staff_hq: item.staff_hq || "", staff_team: item.staff_team || "", staff_rank: item.staff_rank || "" });
    setShowStaffDropdown(false);
  };

  const handleStaffInput = useCallback(async (value: string) => {
    setForm((p) => ({ ...p, staff_input: value, staff_uuid: null, staff_hq: "", staff_team: "", staff_rank: "" }));
    if (!site || value.trim().length < 1) { setStaffOptions([]); setShowStaffDropdown(false); return; }
    try {
      const res = await fetch(`/api/staff?site_id=${site.id}&keyword=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      if (data.staff?.length > 0) { setStaffOptions(data.staff); setShowStaffDropdown(true); } else { setStaffOptions([]); setShowStaffDropdown(false); }
    } catch { setStaffOptions([]); setShowStaffDropdown(false); }
  }, [site]);

  const selectStaff = (s: StaffOption) => {
    setForm((p) => ({ ...p, staff_input: s.display_name, staff_uuid: s.id, staff_hq: s.hq || "", staff_team: s.team || "", staff_rank: s.rank || "" }));
    setShowStaffDropdown(false);
  };

  const handleEditStaffInput = useCallback(async (value: string) => {
    setEditForm((p) => ({ ...p, staff_input: value, staff_uuid: null, staff_hq: "", staff_team: "", staff_rank: "" }));
    if (!site || value.trim().length < 1) { setEditStaffOptions([]); setShowEditStaffDropdown(false); return; }
    try {
      const res = await fetch(`/api/staff?site_id=${site.id}&keyword=${encodeURIComponent(value.trim())}`);
      const data = await res.json();
      if (data.staff?.length > 0) { setEditStaffOptions(data.staff); setShowEditStaffDropdown(true); } else { setEditStaffOptions([]); setShowEditStaffDropdown(false); }
    } catch { setEditStaffOptions([]); setShowEditStaffDropdown(false); }
  }, [site]);

  const selectEditStaff = (s: StaffOption) => {
    setEditForm((p) => ({ ...p, staff_input: s.display_name, staff_uuid: s.id, staff_hq: s.hq || "", staff_team: s.team || "", staff_rank: s.rank || "" }));
    setShowEditStaffDropdown(false);
  };

  const handleSubmit = async () => {
    if (!site || !form.guest_name.trim() || !form.phone.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site_id: site.id, guest_name: form.guest_name.trim(), phone: form.phone.trim(), visit_type: form.visit_type, visit_cnt: form.visit_cnt, staff_uuid: form.staff_uuid }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(INITIAL_FORM);
      if (searchKeyword.trim()) handleSearch();
      loadRecentVisits();
    } catch (err: any) { alert(err.message || "등록 실패"); }
    finally { setIsSubmitting(false); }
  };

  const resetForm = () => { setForm(INITIAL_FORM); setShowStaffDropdown(false); };

  const startEdit = (item: VisitRecord) => {
    setEditingId(item.id);
    setEditForm({ guest_name: item.guest_name, phone: item.phone, visit_type: item.visit_type || "지명", visit_cnt: item.visit_cnt || 1, staff_input: item.staff_name || "", staff_uuid: item.staff_uuid, staff_hq: item.staff_hq || "", staff_team: item.staff_team || "", staff_rank: item.staff_rank || "" });
  };
  const cancelEdit = () => { setEditingId(null); setShowEditStaffDropdown(false); };

  const saveEdit = async () => {
    if (!site || !editingId) return;
    try {
      const res = await fetch("/api/visit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, site_id: site.id, guest_name: editForm.guest_name.trim(), phone: editForm.phone.trim(), visit_type: editForm.visit_type, visit_cnt: editForm.visit_cnt, staff_uuid: editForm.staff_uuid }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingId(null); loadRecentVisits();
      if (searchKeyword.trim()) handleSearch();
    } catch (err: any) { alert(err.message || "수정 실패"); }
  };

  const handleDelete = async (id: string) => {
    if (!site || !confirm("삭제하시겠습니까?")) return;
    try {
      const res = await fetch("/api/visit", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, site_id: site.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      loadRecentVisits();
      if (searchKeyword.trim()) handleSearch();
    } catch (err: any) { alert(err.message || "삭제 실패"); }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSearch(); };

  if (!site) return (<div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-lg">현장 정보를 불러오는 중...</p></div>);

  const ReservedCard = ({ item }: { item: ReservedVisitor }) => (
    <div onClick={() => fillFromReserved(item)} className="p-3 rounded-lg cursor-pointer border border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 transition-colors mb-2">
      <div className="flex items-stretch h-[52px]">
        <div className="flex flex-col justify-center w-1/3 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5"><span className="text-sm">👤</span><span className="text-sm font-bold truncate">{item.guest_name}</span></div>
          <div className="flex items-center gap-1.5"><span className="text-sm">📞</span><span className="text-sm text-gray-600 truncate">{item.phone}</span></div>
        </div>
        <div className="w-px bg-gray-200 shrink-0" />
        <div className="flex flex-col justify-center w-1/3 min-w-0 px-3">
          <div className="text-sm text-gray-700 truncate">{fmtHq(item.staff_hq)} {fmtTeam(item.staff_team)}</div>
          <div className="text-sm text-gray-700 truncate"><span className="font-bold">{item.staff_name || "-"}</span> {item.staff_rank || ""}</div>
        </div>
        <div className="w-px bg-gray-200 shrink-0" />
        <div className="flex flex-col justify-center items-center w-1/3 min-w-0 pl-2">
          <span className="text-[11px] text-gray-400">방문예정</span>
          <span className="text-sm font-semibold tabular-nums text-blue-600">{formatDateFull(item.visit_plan)}</span>
          <span className="text-[10px] text-gray-400 tabular-nums mt-0.5">등록 {formatDateTimeFull(item.created_at || "")}</span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2">
        <span className="px-1.5 py-0.5 bg-gray-800 text-white text-[10px] font-bold rounded shrink-0">메모</span>
        <span className="text-sm text-gray-700 truncate">{item.memo || "-"}</span>
      </div>
    </div>
  );

  const VisitCard = ({ item }: { item: VisitRecord }) => (
    <div onClick={() => fillFromVisit(item)} className="p-3 rounded-lg cursor-pointer border border-gray-200 hover:border-green-400 hover:bg-green-50/40 transition-colors mb-2">
      <div className="flex items-stretch h-[52px]">
        <div className="flex flex-col justify-center w-1/3 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm">👤</span><span className="text-sm font-bold truncate">{item.guest_name}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${visitTypeBadge(item.visit_type)}`}>{item.visit_type || "기타"}</span>
          </div>
          <div className="flex items-center gap-1.5"><span className="text-sm">📞</span><span className="text-sm text-gray-600 truncate">{item.phone}</span></div>
        </div>
        <div className="w-px bg-gray-200 shrink-0" />
        <div className="flex flex-col justify-center w-1/3 min-w-0 px-3">
          <div className="text-sm text-gray-700 truncate">{fmtHq(item.staff_hq)} {fmtTeam(item.staff_team)}</div>
          <div className="text-sm text-gray-700 truncate"><span className="font-bold">{item.staff_name || "-"}</span> {item.staff_rank || ""}</div>
        </div>
        <div className="w-px bg-gray-200 shrink-0" />
        <div className="flex flex-col justify-center items-center w-1/3 min-w-0 pl-2">
          <span className="text-[11px] text-gray-400">내방기록</span>
          <span className="text-sm font-semibold tabular-nums text-green-600">{formatDateFull(item.visit_date)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="flex flex-col bg-gray-50 text-gray-900"
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        width: `${100 / scale}%`,
        height: `${100 / scale}vh`,
      }}
    >
      <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-extrabold tracking-widest text-blue-600">APEX</span>
          <div className="w-px h-5 bg-gray-200" />
          <span className="text-sm text-gray-500 font-medium">조직 방문 관리</span>
          <button onClick={() => { loadTodayVisits(); setShowStatsModal(true); }} className="px-3 py-1.5 bg-violet-500 text-white text-xs font-semibold rounded-lg hover:bg-violet-600 transition-colors">📊 집계</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-xs text-blue-600 font-semibold">📍 {site.name}</span>
          <span className="text-sm text-gray-400 tabular-nums">{clock}</span>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-600 font-medium hover:bg-gray-200 transition-colors">로그아웃</button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[7fr_2fr_1fr] min-h-0">
        {/* ===== 왼쪽 ===== */}
        <section className="flex flex-col border-r border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-white shrink-0">
            <h2 className="text-base font-bold flex items-center gap-2">🔍 방문자 검색</h2>
          </div>
          <div className="flex-1 flex flex-col p-5 gap-3 overflow-hidden">
            <div className="shrink-0 flex flex-col gap-1">
              <label className={labelClass}>방문자 검색 <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <input type="text" placeholder="방문자 성명 또는 전화번호 뒷 4자리" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={onSearchKeyDown} />
                <button onClick={handleSearch} disabled={isSearching} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">검색</button>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-[6fr_4fr] gap-3 min-h-0">
              <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                  <span className="text-sm font-bold">📋 예약 방문자</span>
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">{reservedList.length}건</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {reservedList.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-gray-300 gap-1"><span className="text-2xl">📋</span><span className="text-sm">검색 결과 없음</span></div>) : reservedList.map((item) => <ReservedCard key={item.id} item={item} />)}
                </div>
              </div>
              <div className="flex flex-col border border-gray-200 rounded-lg bg-white overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
                  <span className="text-sm font-bold">📖 내방 기록</span>
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold">{visitList.length}건</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {visitList.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-gray-300 gap-1"><span className="text-2xl">📖</span><span className="text-sm">검색 결과 없음</span></div>) : visitList.map((item) => <VisitCard key={item.id} item={item} />)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 가운데 ===== */}
        <section className="flex flex-col border-r border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-white shrink-0">
            <h2 className="text-base font-bold flex items-center gap-2">✏️ 방문 등록</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>고객명 <span className="text-red-400">*</span></label>
                <input type="text" placeholder="방문자 이름" className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white" value={form.guest_name} onChange={(e) => setForm((p) => ({ ...p, guest_name: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>연락처 <span className="text-red-400">*</span></label>
                <input type="text" placeholder="010-0000-0000" className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 flex flex-col gap-1">
                  <label className={labelClass}>방문구분 <span className="text-red-400">*</span></label>
                  <div className="flex gap-1">
                    {VISIT_TYPES.map((vt) => (
                      <button key={vt} onClick={() => setForm((p) => ({ ...p, visit_type: vt }))} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${form.visit_type === vt ? (vt === "지명" ? "bg-blue-500 text-white" : vt === "워킹" ? "bg-violet-500 text-white" : "bg-gray-500 text-white") : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{vt}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>인원수 <span className="text-red-400">*</span></label>
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden h-[34px]">
                    <button onClick={() => setForm((p) => ({ ...p, visit_cnt: Math.max(1, p.visit_cnt - 1) }))} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 text-base font-bold transition-colors">−</button>
                    <span className="flex-1 text-center text-sm font-semibold tabular-nums">{form.visit_cnt}</span>
                    <button onClick={() => setForm((p) => ({ ...p, visit_cnt: p.visit_cnt + 1 }))} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 text-base font-bold transition-colors">+</button>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1 relative">
                <label className={labelClass}>담당직원 <span className="text-red-400">*</span></label>
                <input type="text" placeholder="이름 또는 번호 4자리" className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white" value={form.staff_input} onChange={(e) => handleStaffInput(e.target.value)} onBlur={() => setTimeout(() => setShowStaffDropdown(false), 200)} onFocus={() => { if (staffOptions.length > 0) setShowStaffDropdown(true); }} />
                {showStaffDropdown && staffOptions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                    {staffOptions.map((s) => (
                      <div key={s.id} onMouseDown={() => selectStaff(s)} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-sm">
                        <span className="font-semibold">{[fmtHq(s.hq), fmtTeam(s.team), s.display_name, s.rank].filter(Boolean).join(" ")}</span>
                        <span className="text-xs text-gray-400 ml-2 shrink-0">{s.phone || ""}</span>
                      </div>
                    ))}
                    <div className="px-3 py-1.5 text-[10px] text-gray-300 bg-gray-50 border-t border-gray-100">💡 목록에 없으면 직접 입력 후 등록 가능</div>
                  </div>
                )}
                {form.staff_uuid && <p className="text-[10px] text-green-500 mt-0.5">✓ 직원 매칭됨</p>}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-gray-400">본부</label><select className={form.staff_uuid ? selectClassDisabled : selectClass} value={form.staff_hq} onChange={(e) => setForm((p) => ({ ...p, staff_hq: e.target.value }))} disabled={!!form.staff_uuid}><option value="">선택</option>{HQ_OPTIONS.map((v) => <option key={v} value={v}>{v}본부</option>)}</select></div>
                <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-gray-400">팀</label><select className={form.staff_uuid ? selectClassDisabled : selectClass} value={form.staff_team} onChange={(e) => setForm((p) => ({ ...p, staff_team: e.target.value }))} disabled={!!form.staff_uuid}><option value="">선택</option>{TEAM_OPTIONS.map((v) => <option key={v} value={v}>{v}팀</option>)}</select></div>
                <div className="flex flex-col gap-1"><label className="text-[11px] font-semibold text-gray-400">직급</label><select className={form.staff_uuid ? selectClassDisabled : selectClass} value={form.staff_rank} onChange={(e) => setForm((p) => ({ ...p, staff_rank: e.target.value }))} disabled={!!form.staff_uuid}><option value="">선택</option>{RANK_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button onClick={handleSubmit} disabled={isSubmitting} className="col-span-2 py-3 bg-emerald-500 text-white text-sm font-bold rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors">방문 등록</button>
                <button onClick={resetForm} className="py-3 border border-gray-300 text-gray-500 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors">초기화</button>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-1.5">🕐 최근 등록</h3>
              {recentVisits.length === 0 ? (
                <p className="text-xs text-gray-300 text-center py-4">등록된 내역이 없습니다</p>
              ) : recentVisits.map((item) => (
                <div key={item.id} className="p-3 border border-gray-200 rounded-lg bg-white mb-2">
                  {editingId === item.id ? (
                    <div className="flex flex-col gap-2">
                      <input type="text" className="px-2 py-1.5 border border-blue-300 rounded text-sm bg-blue-50/30" value={editForm.guest_name} onChange={(e) => setEditForm((p) => ({ ...p, guest_name: e.target.value }))} />
                      <input type="text" className="px-2 py-1.5 border border-blue-300 rounded text-sm bg-blue-50/30" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: formatPhoneInput(e.target.value) }))} />
                      <div className="flex gap-1">
                        {VISIT_TYPES.map((vt) => (<button key={vt} onClick={() => setEditForm((p) => ({ ...p, visit_type: vt }))} className={`flex-1 py-1 rounded text-xs font-semibold transition-colors ${editForm.visit_type === vt ? (vt === "지명" ? "bg-blue-500 text-white" : vt === "워킹" ? "bg-violet-500 text-white" : "bg-gray-500 text-white") : "bg-gray-100 text-gray-500"}`}>{vt}</button>))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">인원</span>
                        <div className="flex items-center border border-blue-300 rounded overflow-hidden h-7">
                          <button onClick={() => setEditForm((p) => ({ ...p, visit_cnt: Math.max(1, p.visit_cnt - 1) }))} className="w-7 h-full text-gray-500 hover:bg-gray-100 text-sm font-bold">−</button>
                          <span className="w-7 text-center text-xs font-semibold">{editForm.visit_cnt}</span>
                          <button onClick={() => setEditForm((p) => ({ ...p, visit_cnt: p.visit_cnt + 1 }))} className="w-7 h-full text-gray-500 hover:bg-gray-100 text-sm font-bold">+</button>
                        </div>
                      </div>
                      <div className="relative">
                        <input type="text" placeholder="담당직원" className="w-full px-2 py-1.5 border border-blue-300 rounded text-sm bg-blue-50/30" value={editForm.staff_input} onChange={(e) => handleEditStaffInput(e.target.value)} onBlur={() => setTimeout(() => setShowEditStaffDropdown(false), 200)} onFocus={() => { if (editStaffOptions.length > 0) setShowEditStaffDropdown(true); }} />
                        {showEditStaffDropdown && editStaffOptions.length > 0 && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-10 max-h-32 overflow-y-auto">{editStaffOptions.map((s) => (<div key={s.id} onMouseDown={() => selectEditStaff(s)} className="px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-xs">{[fmtHq(s.hq), fmtTeam(s.team), s.display_name, s.rank].filter(Boolean).join(" ")}</div>))}</div>)}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <select className={selectClass + " !text-xs !py-1"} value={editForm.staff_hq} onChange={(e) => setEditForm((p) => ({ ...p, staff_hq: e.target.value }))} disabled={!!editForm.staff_uuid}><option value="">본부</option>{HQ_OPTIONS.map((v) => <option key={v} value={v}>{v}본부</option>)}</select>
                        <select className={selectClass + " !text-xs !py-1"} value={editForm.staff_team} onChange={(e) => setEditForm((p) => ({ ...p, staff_team: e.target.value }))} disabled={!!editForm.staff_uuid}><option value="">팀</option>{TEAM_OPTIONS.map((v) => <option key={v} value={v}>{v}팀</option>)}</select>
                        <select className={selectClass + " !text-xs !py-1"} value={editForm.staff_rank} onChange={(e) => setEditForm((p) => ({ ...p, staff_rank: e.target.value }))} disabled={!!editForm.staff_uuid}><option value="">직급</option>{RANK_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="flex-1 py-1.5 bg-blue-500 text-white text-xs font-bold rounded hover:bg-blue-600 transition-colors">저장</button>
                        <button onClick={cancelEdit} className="flex-1 py-1.5 border border-gray-300 text-gray-500 text-xs font-semibold rounded hover:bg-gray-100 transition-colors">취소</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-bold truncate">{item.guest_name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${visitTypeBadge(item.visit_type)}`}>{item.visit_type || "기타"}</span>
                          <span className="text-[10px] text-gray-400">{item.visit_cnt}명</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">{item.phone} · {[fmtHq(item.staff_hq), fmtTeam(item.staff_team), item.staff_name, item.staff_rank].filter(Boolean).join(" ") || "-"}</div>
                      </div>
                      <button onClick={() => startEdit(item)} className="px-2.5 py-1 text-xs font-semibold text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors shrink-0">수정</button>
                      <button onClick={() => handleDelete(item.id)} className="px-2.5 py-1 text-xs font-semibold text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors shrink-0">삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 오른쪽 ===== */}
        <section className="flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-white shrink-0 flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">🪪 직원 조회 <span className="text-xs text-gray-400 font-normal ml-1">{allStaffList.length}명</span></h2>
            <button onClick={() => { setShowCarModal(true); setCarSearchKeyword(""); setCarSearchResults([]); }} className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 transition-colors">🚗 차량검색</button>
          </div>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-4 pb-1 shrink-0 flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>이름 또는 전화번호로 검색</label>
                <input type="text" placeholder="검색어 입력" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white" value={staffKeyword} onChange={(e) => setStaffKeyword(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <select className={selectClass + " flex-1 !text-xs"} value={staffFilterHq} onChange={(e) => { setStaffFilterHq(e.target.value); setStaffFilterTeam(""); }}><option value="">전체 본부</option>{staffHqOptions.map((v) => <option key={v} value={v}>{fmtHq(v)}</option>)}</select>
                <select className={selectClass + " flex-1 !text-xs"} value={staffFilterTeam} onChange={(e) => setStaffFilterTeam(e.target.value)}><option value="">전체 팀</option>{staffTeamOptions.map((v) => <option key={v} value={v}>{fmtTeam(v)}</option>)}</select>
              </div>
              <p className="text-xs text-gray-400">{filteredStaff.length}명</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-4">
              {isStaffLoading ? (<div className="flex flex-col items-center justify-center py-16 text-gray-300 gap-1"><span className="text-sm">직원 목록 불러오는 중...</span></div>)
              : filteredStaff.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-gray-300 gap-1"><span className="text-2xl">🪪</span><span className="text-sm">검색 결과 없음</span></div>)
              : filteredStaff.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg bg-white mb-2 hover:border-emerald-300 transition-colors">
                  <span className="text-lg shrink-0">{getStaffEmoji(s.id)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{[fmtHq(s.hq), fmtTeam(s.team), s.display_name, s.rank].filter(Boolean).join(" ")}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.phone || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* 차량검색 드로어 */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${showCarModal ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-black/40" onClick={() => setShowCarModal(false)} />
        <div className={`absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ${showCarModal ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <h3 className="text-base font-bold">🚗 차량 검색</h3>
            <button onClick={() => setShowCarModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="p-5">
            <div className="mb-4">
              <input
                type="text"
                placeholder="차량번호 뒤 4자리"
                maxLength={4}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                value={carSearchKeyword}
                onChange={(e) => setCarSearchKeyword(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 160px)" }}>
              {isCarSearching ? (
                <div className="text-center text-gray-400 py-8">검색 중...</div>
              ) : carSearchResults.length === 0 ? (
                <div className="text-center text-gray-300 py-8">
                  <span className="text-2xl block mb-1">🚗</span>
                  <span className="text-sm">{carSearchKeyword ? "검색 결과 없음" : "차량번호를 입력하세요"}</span>
                </div>
              ) : (
                carSearchResults.map((r) => (
                  <div key={r.id} className="px-4 py-3 border border-gray-200 rounded-lg mb-2 bg-gray-50">
                    <div className="text-sm font-medium text-gray-800">{[fmtHq(r.hq), fmtTeam(r.team), r.name, r.rank].filter(Boolean).join(" ")}</div>
                    <div className="text-xs text-emerald-600 mt-1 font-medium">{[r.car_model, r.car_color, r.car_number].filter(Boolean).join(" · ")}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 집계 모달 */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowStatsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-bold">📊 오늘 방문 집계</h3>
              <button onClick={() => setShowStatsModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-left text-gray-500 font-medium">시간대</th>
                    <th className="py-2 text-center text-blue-600 font-medium" colSpan={2}>지명</th>
                    <th className="py-2 text-center text-violet-600 font-medium" colSpan={2}>워킹</th>
                  </tr>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th></th>
                    <th className="py-1 text-center">건</th>
                    <th className="py-1 text-center">명</th>
                    <th className="py-1 text-center">건</th>
                    <th className="py-1 text-center">명</th>
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((slot, idx) => (
                    <tr key={slot} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-gray-600">{slot}</td>
                      <td className="py-2 text-center text-blue-600 font-medium">{visitStats[idx].jm_cnt || "-"}</td>
                      <td className="py-2 text-center text-blue-600">{visitStats[idx].jm_ppl || "-"}</td>
                      <td className="py-2 text-center text-violet-600 font-medium">{visitStats[idx].wk_cnt || "-"}</td>
                      <td className="py-2 text-center text-violet-600">{visitStats[idx].wk_ppl || "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold">
                    <td className="py-3 text-gray-800">합계</td>
                    <td className="py-3 text-center text-blue-600">{totalStats.jm_cnt}</td>
                    <td className="py-3 text-center text-blue-600">{totalStats.jm_ppl}</td>
                    <td className="py-3 text-center text-violet-600">{totalStats.wk_cnt}</td>
                    <td className="py-3 text-center text-violet-600">{totalStats.wk_ppl}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}