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
 * GET /api/staff?site_id=xxx&keyword=yyy
 * 담당직원 자동완성용
 */
export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get("site_id");
    const keyword = req.nextUrl.searchParams.get("keyword")?.trim();

    if (!siteId || !keyword) {
      return NextResponse.json({ staff: [] });
    }

    const srv = serviceClient();
    const isPhone = /^\d{1,4}$/.test(keyword);

    let query = srv
      .from("users_staff")
      .select("id, hq, team, name, rank, sales_name, phone")
      .eq("site_id", siteId)
      .eq("staff_type", "영업사원")
      .limit(10);

    if (isPhone) {
      query = query.ilike("phone", `%${keyword}%`);
    } else {
      query = query.or(`name.ilike.%${keyword}%,sales_name.ilike.%${keyword}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const results = (data || []).map((s) => ({
      id: s.id,
      display_name: s.sales_name || s.name,
      hq: s.hq,
      team: s.team,
      rank: s.rank,
      phone: s.phone,
      phone_index: s.phone ? s.phone.slice(-4) : null,
    }));

    return NextResponse.json({ staff: results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
