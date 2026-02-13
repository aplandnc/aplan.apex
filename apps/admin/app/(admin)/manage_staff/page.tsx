"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type CellContext,
} from "@tanstack/react-table";
import { supabaseAppClient } from "@apex/config";
import AdminPageShell from "@/components/AdminPageShell";
import { adminUi } from "@apex/ui/styles/admin";

// ── 상수 ──
const STAFF_TYPES = ["기획", "상담사", "TM", "큐레이터", "아르바이트", "홍보단", "영업사원", "기타"] as const;
const RANKS = ["팀장", "부장", "차장", "실장", "과장", "대리"];
const SALES_RANKS = ["총괄", "팀장", "부장", "차장", "실장", "과장", "대리", "사원", "기타"];
const HQ_LIST = Array.from({ length: 11 }, (_, i) => `${i}본부`);
const TEAM_LIST = Array.from({ length: 21 }, (_, i) => `${i}팀`);

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  approved: { label: "활성", color: "text-green-600" },
  rejected: { label: "반려", color: "text-red-600" },
  inactive: { label: "비활성", color: "text-gray-400" },
  pending: { label: "대기", color: "text-yellow-600" },
};

// ── 타입 ──
interface Site {
  id: string;
  name: string;
}

interface Staff {
  id: string;
  site_id: string;
  staff_type: string | null;
  hq: string | null;
  team: string | null;
  rank: string | null;
  name: string | null;
  sales_name: string | null;
  status: string | null;
  doc_submitted: boolean;
  pledge_submitted: boolean;
}

// ── 셀 컴포넌트 ──

function TextCell({ getValue, row, column, table }: CellContext<Staff, unknown>) {
  const initialValue = (getValue() as string) ?? "";
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const onBlur = () => {
    if (value !== initialValue) {
      (table.options.meta as TableMeta).updateData(row.index, column.id, value);
    }
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="w-full border-0 bg-transparent px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
    />
  );
}

function SelectCell({
  getValue,
  row,
  column,
  table,
  options,
  displayFn,
}: CellContext<Staff, unknown> & {
  options: { value: string; label: string }[];
  displayFn?: (val: string) => string;
}) {
  const currentValue = (getValue() as string) ?? "";

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    (table.options.meta as TableMeta).updateData(row.index, column.id, e.target.value);
  };

  return (
    <select
      value={currentValue}
      onChange={onChange}
      className="w-full border-0 bg-transparent px-1 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 rounded cursor-pointer"
    >
      <option value="">-</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {displayFn ? displayFn(opt.value) : opt.label}
        </option>
      ))}
    </select>
  );
}

// ── 테이블 메타 타입 ──
interface TableMeta {
  updateData: (rowIndex: number, columnId: string, value: string) => void;
  sites: Site[];
}

// ── 메인 컴포넌트 ──
export default function StaffManagePage() {
  const supabase = supabaseAppClient();
  const [sites, setSites] = React.useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("");
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingCells, setSavingCells] = React.useState<Set<string>>(new Set());

  // 현장 목록 로드
  React.useEffect(() => {
    async function fetchSites() {
      const { data } = await supabase.from("sites").select("id, name").order("name");
      if (data) {
        setSites(data);
        if (data.length > 0) setSelectedSiteId(data[0].id);
      }
    }
    fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 직원 목록 로드
  React.useEffect(() => {
    if (selectedSiteId) fetchStaffList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  const fetchStaffList = async () => {
    if (!selectedSiteId) return;
    setLoading(true);

    // 직원 목록
    const { data: staffData, error: staffError } = await supabase
      .from("users_staff")
      .select("id, site_id, staff_type, hq, team, rank, name, sales_name, status")
      .eq("site_id", selectedSiteId)
      .in("status", ["approved", "pending", "rejected", "inactive"])
      .order("created_at", { ascending: false });

    if (staffError || !staffData) {
      console.error("Error fetching staff:", staffError);
      setStaffList([]);
      setLoading(false);
      return;
    }

    const staffIds = staffData.map((s) => s.id);

    // 서류 제출 여부
    const { data: docsData } = await supabase
      .from("users_staff_docs")
      .select("user_id, submitted_at")
      .in("user_id", staffIds);

    // 근무이행각서 제출 여부
    const { data: pledgeData } = await supabase
      .from("users_staff_pledge")
      .select("user_id, is_submitted")
      .in("user_id", staffIds);

    const docSet = new Set(
      (docsData ?? []).filter((d) => d.submitted_at).map((d) => d.user_id)
    );
    const pledgeSet = new Set(
      (pledgeData ?? []).filter((p) => p.is_submitted === true).map((p) => p.user_id)
    );

    const merged: Staff[] = staffData.map((s) => ({
      ...s,
      doc_submitted: docSet.has(s.id),
      pledge_submitted: pledgeSet.has(s.id),
    }));

    setStaffList(merged);
    setLoading(false);
  };

  // 셀 업데이트 → Supabase 자동저장
  const updateData = React.useCallback(
    async (rowIndex: number, columnId: string, value: string) => {
      const staff = staffList[rowIndex];
      if (!staff) return;

      const cellKey = `${staff.id}-${columnId}`;
      setSavingCells((prev) => new Set(prev).add(cellKey));

      setStaffList((prev) =>
        prev.map((row, i) => (i === rowIndex ? { ...row, [columnId]: value || null } : row))
      );

      const { error } = await supabase
        .from("users_staff")
        .update({ [columnId]: value || null })
        .eq("id", staff.id);

      if (error) {
        console.error("저장 실패:", error);
        fetchStaffList();
      }

      setSavingCells((prev) => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });

      if (columnId === "site_id" && value !== selectedSiteId) {
        setStaffList((prev) => prev.filter((_, i) => i !== rowIndex));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [staffList, selectedSiteId]
  );

  // soft delete
  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const { error } = await supabase
      .from("users_staff")
      .update({ status: "deleted" })
      .eq("id", id);

    if (error) {
      console.error("삭제 실패:", error);
    } else {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // ── 컬럼 정의 ──
  const siteOptions = React.useMemo(
    () => sites.map((s) => ({ value: s.id, label: s.name })),
    [sites]
  );

  const columns = React.useMemo<ColumnDef<Staff, any>[]>(
    () => [
      {
        accessorKey: "site_id",
        header: "현장명",
        size: 130,
        cell: (info) =>
          SelectCell({
            ...info,
            options: siteOptions,
            displayFn: (val) => sites.find((s) => s.id === val)?.name ?? "-",
          }),
      },
      {
        accessorKey: "staff_type",
        header: "직무",
        size: 100,
        cell: (info) =>
          SelectCell({
            ...info,
            options: STAFF_TYPES.map((t) => ({ value: t, label: t })),
          }),
      },
      {
        accessorKey: "hq",
        header: "본부",
        size: 90,
        cell: (info) =>
          SelectCell({
            ...info,
            options: HQ_LIST.map((h) => ({ value: h, label: h })),
          }),
      },
      {
        accessorKey: "team",
        header: "팀",
        size: 80,
        cell: (info) =>
          SelectCell({
            ...info,
            options: TEAM_LIST.map((t) => ({ value: t, label: t })),
          }),
      },
      {
        accessorKey: "rank",
        header: "직급",
        size: 90,
        cell: (info) => {
          const staffType = info.row.original.staff_type;
          let rankOptions = [...new Set([...RANKS, ...SALES_RANKS])];
          if (staffType === "영업사원") rankOptions = SALES_RANKS;
          else if (["기획", "상담사", "TM"].includes(staffType ?? "")) rankOptions = RANKS;

          return SelectCell({
            ...info,
            options: rankOptions.map((r) => ({ value: r, label: r })),
          });
        },
      },
      {
        accessorKey: "name",
        header: "본명",
        size: 100,
        cell: TextCell,
      },
      {
        accessorKey: "sales_name",
        header: "영업명",
        size: 100,
        cell: TextCell,
      },
      {
        accessorKey: "status",
        header: "상태",
        size: 70,
        cell: ({ getValue }) => {
          const val = (getValue() as string) ?? "";
          const mapped = STATUS_MAP[val] ?? { label: val, color: "text-gray-500" };
          return (
            <div className={`text-center text-xs font-semibold ${mapped.color} py-2`}>
              {mapped.label}
            </div>
          );
        },
      },
      {
        accessorKey: "doc_submitted",
        header: "서류제출",
        size: 80,
        cell: ({ getValue }) => {
          const submitted = getValue() as boolean;
          return (
            <div className={`text-center text-xs font-semibold py-2 ${submitted ? "text-green-600" : "text-red-500"}`}>
              {submitted ? "제출" : "미제출"}
            </div>
          );
        },
      },
      {
        accessorKey: "pledge_submitted",
        header: "근무이행각서",
        size: 100,
        cell: ({ getValue }) => {
          const submitted = getValue() as boolean;
          return (
            <div className={`text-center text-xs font-semibold py-2 ${submitted ? "text-green-600" : "text-red-500"}`}>
              {submitted ? "제출" : "미제출"}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "관리",
        size: 70,
        cell: ({ row }) => (
          <div className="flex justify-center py-1">
            <button
              onClick={() => handleDelete(row.original.id)}
              className={adminUi.buttonClass.dangerSm}
            >
              삭제
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [siteOptions, sites]
  );

  const table = useReactTable({
    data: staffList,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: {
      updateData,
      sites,
    } as TableMeta,
  });

  return (
    <AdminPageShell title="직원 관리">
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

      {/* 직원 목록 테이블 */}
      <div className={adminUi.card}>
        <div className={adminUi.cardTopBar}>
          <div className="text-sm font-semibold text-gray-600">
            직원 수: <span className="font-semibold text-gray-900">{staffList.length}</span>명
          </div>
          {savingCells.size > 0 && (
            <span className="text-xs text-blue-500 animate-pulse">저장 중...</span>
          )}
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">로딩 중...</div>
        ) : staffList.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">직원이 없습니다.</div>
        ) : (
          <div className={adminUi.tableWrap}>
            <table className={`${adminUi.table} border-collapse`}>
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className={adminUi.theadRow}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`${adminUi.th} border-r border-gray-200 last:border-r-0`}
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className={adminUi.tbody}>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className={`${adminUi.tr} hover:bg-blue-50/50`}>
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={`${adminUi.td} !p-0 border-r border-gray-200 last:border-r-0`}
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminPageShell>
  );
}