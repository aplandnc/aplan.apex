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
 * GET /api/car-search?site_id=xxx&car_number=1234
 * 차량번호 뒤 4자리로 직원 검색
 */
export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get("site_id");
    const carNumber = req.nextUrl.searchParams.get("car_number")?.trim();

    if (!siteId || !carNumber) {
      return NextResponse.json({ results: [] });
    }

    const srv = serviceClient();

    const { data, error } = await srv
      .from("users_staff")
      .select("id, hq, team, name, rank, car_model, car_color, car_number")
      .eq("site_id", siteId)
      .ilike("car_number", `%${carNumber}%`)
      .limit(20);

    if (error) throw error;

    const results = (data || []).map((s) => ({
      id: s.id,
      hq: s.hq,
      team: s.team,
      name: s.name,
      rank: s.rank,
      car_model: s.car_model,
      car_color: s.car_color,
      car_number: s.car_number,
    }));

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
