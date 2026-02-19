import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * POST /api/search
 * body: { site_id, keyword, type: "visitor" | "staff" | "staff_all" | "recent_visits" }
 */
export async function POST(req: NextRequest) {
  try {
    const { site_id, keyword, type } = await req.json();

    if (!site_id) {
      return NextResponse.json({ error: "site_id 필수" }, { status: 400 });
    }

    // staff_all, recent_visits는 keyword 없어도 허용
    if (type !== "staff_all" && type !== "recent_visits" && !keyword?.trim()) {
      return NextResponse.json({ error: "site_id, keyword 필수" }, { status: 400 });
    }

    const srv = serviceClient();
    const kw = keyword?.trim() || "";
    const isPhone = /^\d{1,4}$/.test(kw);

    // ── 최근 등록 5건 ──
    if (type === "recent_visits") {
      // created_at이 없을 수 있으므로 id desc로 정렬 (auto increment/uuid v7 등 최신순)
      const { data: visitData, error: visitErr } = await srv
        .from("visitor_guest")
        .select("id, guest_name, phone, phone_index, visit_date, visit_type, visit_cnt, staff_uuid")
        .eq("site_id", site_id)
        .order("visit_date", { ascending: false })
        .order("id", { ascending: false })
        .limit(5);

      if (visitErr) throw visitErr;

      let visitWithStaff: any[] = [];
      if (visitData && visitData.length > 0) {
        const staffIds = Array.from(new Set(visitData.filter((v) => v.staff_uuid).map((v) => v.staff_uuid as string)));
        let staffMap = new Map<string, { name: string; hq: string | null; team: string | null; rank: string | null }>();
        if (staffIds.length > 0) {
          const { data: staffData } = await srv
            .from("users_staff")
            .select("id, name, sales_name, hq, team, rank")
            .in("id", staffIds);
          staffMap = new Map(
            (staffData || []).map((s) => [
              s.id,
              { name: s.sales_name || s.name, hq: s.hq, team: s.team, rank: s.rank },
            ])
          );
        }
        visitWithStaff = visitData.map((v) => {
          const staff = v.staff_uuid ? staffMap.get(v.staff_uuid as string) : null;
          return {
            ...v,
            staff_name: staff?.name || "-",
            staff_hq: staff?.hq || null,
            staff_team: staff?.team || null,
            staff_rank: staff?.rank || null,
          };
        });
      }

      return NextResponse.json({ visits: visitWithStaff });
    }

    // ── 전체 직원 목록 ──
    if (type === "staff_all") {
      const { data, error } = await srv
        .from("users_staff")
        .select("id, hq, team, name, rank, sales_name, phone")
        .eq("site_id", site_id)
        .eq("staff_type", "영업사원")
        .order("hq", { ascending: true })
        .order("team", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      const results = (data || []).map((s) => ({
        ...s,
        phone_index: s.phone ? s.phone.slice(-4) : null,
        display_name: s.sales_name || s.name,
      }));

      return NextResponse.json({ staff: results });
    }

    // ── 직원 검색 ──
    if (type === "staff") {
      let query = srv
        .from("users_staff")
        .select("id, hq, team, name, rank, sales_name, phone")
        .eq("site_id", site_id)
        .eq("staff_type", "영업사원")
        .limit(20);

      if (isPhone) {
        query = query.ilike("phone", `%${kw}%`);
      } else {
        query = query.or(`name.ilike.%${kw}%,sales_name.ilike.%${kw}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const results = (data || []).map((s) => ({
        ...s,
        phone_index: s.phone ? s.phone.slice(-4) : null,
        display_name: s.sales_name || s.name,
      }));

      return NextResponse.json({ staff: results });
    }

    // ── 방문자 검색 (예약 + 내방기록) ──

    // 1) 예약 방문자
    let reservedQuery = srv
      .from("visitor_reserved")
      .select("id, guest_name, phone, phone_index, visit_plan, memo, user_id, created_at")
      .eq("site_id", site_id)
      .order("visit_plan", { ascending: false })
      .limit(20);

    if (isPhone) {
      reservedQuery = reservedQuery.eq("phone_index", kw);
    } else {
      reservedQuery = reservedQuery.ilike("guest_name", `%${kw}%`);
    }

    const { data: reservedData, error: resErr } = await reservedQuery;
    if (resErr) throw resErr;

    // 예약건 담당직원 정보 조회 (hq, team, rank 포함)
    let reservedWithStaff: any[] = [];
    if (reservedData && reservedData.length > 0) {
      const staffIds = Array.from(new Set(reservedData.map((r) => r.user_id as string)));
      const { data: staffData } = await srv
        .from("users_staff")
        .select("id, name, sales_name, hq, team, rank")
        .in("id", staffIds);

      const staffMap = new Map(
        (staffData || []).map((s) => [
          s.id,
          {
            name: s.sales_name || s.name,
            hq: s.hq,
            team: s.team,
            rank: s.rank,
          },
        ])
      );

      reservedWithStaff = reservedData.map((r) => {
        const staff = staffMap.get(r.user_id);
        return {
          ...r,
          staff_name: staff?.name || "-",
          staff_hq: staff?.hq || null,
          staff_team: staff?.team || null,
          staff_rank: staff?.rank || null,
        };
      });
    }

    // 2) 내방 기록
    let visitQuery = srv
      .from("visitor_guest")
      .select("id, guest_name, phone, phone_index, visit_date, visit_type, visit_cnt, staff_uuid")
      .eq("site_id", site_id)
      .order("visit_date", { ascending: false })
      .limit(20);

    if (isPhone) {
      visitQuery = visitQuery.eq("phone_index", kw);
    } else {
      visitQuery = visitQuery.ilike("guest_name", `%${kw}%`);
    }

    const { data: visitData, error: visitErr } = await visitQuery;
    if (visitErr) throw visitErr;

    // 내방기록 담당직원 정보 조회 (hq, team, rank 포함)
    let visitWithStaff: any[] = [];
    if (visitData && visitData.length > 0) {
      const staffIds = Array.from(new Set(visitData.filter((v) => v.staff_uuid).map((v) => v.staff_uuid as string)));
      let staffMap = new Map<string, { name: string; hq: string | null; team: string | null; rank: string | null }>();
      if (staffIds.length > 0) {
        const { data: staffData } = await srv
          .from("users_staff")
          .select("id, name, sales_name, hq, team, rank")
          .in("id", staffIds);
        staffMap = new Map(
          (staffData || []).map((s) => [
            s.id,
            {
              name: s.sales_name || s.name,
              hq: s.hq,
              team: s.team,
              rank: s.rank,
            },
          ])
        );
      }
      visitWithStaff = visitData.map((v) => {
        const staff = v.staff_uuid ? staffMap.get(v.staff_uuid as string) : null;
        return {
          ...v,
          staff_name: staff?.name || "-",
          staff_hq: staff?.hq || null,
          staff_team: staff?.team || null,
          staff_rank: staff?.rank || null,
        };
      });
    }

    return NextResponse.json({
      reserved: reservedWithStaff,
      visits: visitWithStaff,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}