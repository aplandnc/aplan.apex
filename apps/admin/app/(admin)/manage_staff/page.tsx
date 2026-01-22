"use client";

import * as React from "react";
import { supabaseAppClient } from "@apex/config";
import AdminPageShell from "@/components/AdminPageShell";
import { adminUi } from "@/styles/adminUi";

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
  documents_submitted?: boolean;
  agreement_submitted?: boolean;
}

export default function StaffManagePage() {
  const supabase = supabaseAppClient();
  const [sites, setSites] = React.useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string>("");
  const [staffList, setStaffList] = React.useState<Staff[]>([]);
  const [loading, setLoading] = React.useState(true);

  // 현장 목록 로드
  React.useEffect(() => {
    async function fetchSites() {
      const { data } = await supabase.from("sites").select("id, name").order("name");

      if (data) {
        setSites(data);
        if (data.length > 0) {
          setSelectedSiteId(data[0].id);
        }
      }
    }
    fetchSites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 선택된 현장 변경시 직원 목록 로드
  React.useEffect(() => {
    if (selectedSiteId) {
      fetchStaffList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId]);

  const fetchStaffList = async () => {
    if (!selectedSiteId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("users_staff")
      .select("id, site_id, staff_type, hq, team, rank, name, sales_name")
      .eq("site_id", selectedSiteId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching staff:", error);
      setStaffList([]);
    } else {
      setStaffList(data || []);
    }
    setLoading(false);
  };

  const handleEdit = (id: string) => {
    console.log("Edit staff:", id);
    // TODO: 수정 모달 또는 페이지 이동
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    console.log("Delete staff:", id);
    // TODO: DB 삭제 로직
  };

  const getSiteName = (siteId: string) => {
    return sites.find((s) => s.id === siteId)?.name ?? "-";
  };

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

      {/* 직원 목록 카드 */}
      <div className={adminUi.card}>
        <div className={adminUi.cardTopBar}>
          <div className="text-sm font-semibold text-gray-600">
            직원 수: <span className="font-semibold text-gray-900">{staffList.length}</span>명
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">로딩 중...</div>
        ) : staffList.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">직원이 없습니다.</div>
        ) : (
          <div className={adminUi.tableWrap}>
            <table className={adminUi.table}>
              <thead>
                <tr className={adminUi.theadRow}>
                  <th className={adminUi.th}>현장명</th>
                  <th className={adminUi.th}>직무</th>
                  <th className={adminUi.th}>본부</th>
                  <th className={adminUi.th}>팀</th>
                  <th className={adminUi.th}>직급</th>
                  <th className={adminUi.th}>본명</th>
                  <th className={adminUi.th}>영업명</th>
                  <th className={adminUi.th}>서류</th>
                  <th className={adminUi.th}>각서</th>
                  <th className={adminUi.th}>관리</th>
                </tr>
              </thead>
              <tbody className={adminUi.tbody}>
                {staffList.map((staff) => (
                  <tr key={staff.id} className={adminUi.tr}>
                    <td className={adminUi.td}>{getSiteName(staff.site_id)}</td>
                    <td className={adminUi.td}>{staff.staff_type ?? "-"}</td>
                    <td className={adminUi.td}>{staff.hq ? `${staff.hq}본부` : "-"}</td>
                    <td className={adminUi.td}>{staff.team ? `${staff.team}팀` : "-"}</td>
                    <td className={adminUi.td}>{staff.rank ?? "-"}</td>
                    <td className={adminUi.td}>{staff.name ?? "-"}</td>
                    <td className={adminUi.td}>{staff.sales_name ?? "-"}</td>
                    <td className={adminUi.td}>
                      <div className="flex justify-center">
                        {staff.documents_submitted ? (
                          <span className="text-green-600 text-lg">✓</span>
                        ) : (
                          <span className="text-red-600 text-lg">✕</span>
                        )}
                      </div>
                    </td>
                    <td className={adminUi.td}>
                      <div className="flex justify-center">
                        {staff.agreement_submitted ? (
                          <span className="text-green-600 text-lg">✓</span>
                        ) : (
                          <span className="text-red-600 text-lg">✕</span>
                        )}
                      </div>
                    </td>
                    <td className={adminUi.td}>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(staff.id)}
                          className={adminUi.buttonClass.primarySm}
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(staff.id)}
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
        )}
      </div>
    </AdminPageShell>
  );
}