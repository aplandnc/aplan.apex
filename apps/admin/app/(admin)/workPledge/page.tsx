// apps/admin/app/(admin)/workPledge/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseAppClient } from "@apex/config";
import TipTapEditor from "@/components/TipTapEditor";
import { adminUi } from "@apex/ui/styles/admin";

interface Site {
  id: string;
  name: string;
}

interface WorkPledge {
  id: string;
  site_id: string | null;
  content: string;
  updated_at: string;
}

export default function WorkPledgePage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | "all">("all");
  const [workPledge, setWorkPledge] = useState<WorkPledge | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDefault, setLoadingDefault] = useState(false);

  // 현장 목록 로드
  useEffect(() => {
    fetchSites();
  }, []);

  // 선택된 현장의 템플릿 로드
  useEffect(() => {
    fetchWorkPledge();
  }, [selectedSite]);

  const fetchSites = async () => {
    const { data, error } = await supabaseAppClient()
      .from("sites")
      .select("id, name")
      .order("name");

    if (error) {
      console.error("현장 로드 실패:", error);
      return;
    }

    setSites(data || []);
  };

  const fetchWorkPledge = async () => {
    setLoading(true);
    
    let query = supabaseAppClient()
      .from("sites_workpledge")
      .select("*");
    
    if (selectedSite === "all") {
      // 기본템플릿: name="default"로 조회
      query = query.eq("name", "default");
    } else {
      // 현장: site_id로 조회
      query = query.eq("site_id", selectedSite.id);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("템플릿 로드 실패:", error);
      setLoading(false);
      return;
    }

    setWorkPledge(data);
    
    // {{현장명}} 치환 처리
    let replacedContent = data?.content || "";
    if (selectedSite !== "all") {
      replacedContent = replacedContent.replace(/{{현장명}}/g, selectedSite.name);
    }
    
    setContent(replacedContent);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }

    setSaving(true);

    const siteId = selectedSite === "all" ? null : selectedSite.id;
    const siteName = selectedSite === "all" ? "default" : selectedSite.name;

    if (workPledge) {
      // 업데이트
      const { error } = await supabaseAppClient()
        .from("sites_workpledge")
        .update({
          name: siteName,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", workPledge.id);

      if (error) {
        console.error("저장 실패:", error);
        alert("저장에 실패했습니다.");
      } else {
        alert("저장되었습니다.");
        fetchWorkPledge();
      }
    } else {
      // 새로 생성
      const { error } = await supabaseAppClient()
        .from("sites_workpledge")
        .insert({
          site_id: siteId,
          name: siteName,
          content,
        });

      if (error) {
        console.error("저장 실패:", error);
        alert("저장에 실패했습니다.");
      } else {
        alert("저장되었습니다.");
        fetchWorkPledge();
      }
    }

    setSaving(false);
  };

  const handleLoadDefault = async () => {
    if (!confirm("기본 템플릿을 불러오시겠습니까?\n현재 내용은 삭제되고 기본 템플릿으로 덮어씌워집니다.")) {
      return;
    }

    setLoadingDefault(true);

    const { data, error } = await supabaseAppClient()
      .from("sites_workpledge")
      .select("*")
      .eq("name", "default")
      .is("site_id", null)
      .maybeSingle();

    if (error) {
      console.error("기본 템플릿 로드 실패:", error);
      alert("기본 템플릿 로드에 실패했습니다.");
      setLoadingDefault(false);
      return;
    }

    if (data) {
      // {{현장명}} 치환 처리
      let replacedContent = data.content || "";
      if (selectedSite !== "all") {
        replacedContent = replacedContent.replace(/{{현장명}}/g, selectedSite.name);
      }
      
      setContent(replacedContent);
      alert("기본 템플릿을 불러왔습니다.");
    } else {
      alert("기본 템플릿이 없습니다.");
    }

    setLoadingDefault(false);
  };

  return (
    <div className="bg-gradient-apex min-h-screen">
      <div className="container mx-auto px-6 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">근무이행각서 관리</h1>
          <p className="text-gray-600">현장별 근무이행각서 템플릿을 관리합니다.</p>
        </div>

        {/* 현장 선택 */}
        <div className={`mb-6 ${adminUi.card}`}>
          <h2 className="mb-3 text-sm font-medium text-gray-700">현장 선택</h2>
          <div className="grid grid-cols-5 gap-3">
            <button
              onClick={() => setSelectedSite("all")}
              className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                selectedSite === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              기본 템플릿
            </button>
            {sites.map((site) => (
              <button
                key={site.id}
                onClick={() => setSelectedSite(site)}
                className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  selectedSite !== "all" && selectedSite.id === site.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>

        {/* 에디터 영역 */}
        {loading ? (
          <div className={`${adminUi.card} p-12 text-center`}>
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : (
          <>
            <TipTapEditor 
              content={content} 
              onChange={setContent}
              onSave={handleSave}
              saving={saving}
              onLoadDefault={selectedSite !== "all" ? handleLoadDefault : undefined}
              loadingDefault={loadingDefault}
            />
            
            {workPledge && (
              <div className="mt-4 text-sm text-gray-500 text-right">
                마지막 수정: {new Date(workPledge.updated_at).toLocaleString("ko-KR")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}