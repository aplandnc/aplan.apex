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
 * GET /api/visitor-count?site_id=xxx
 * 오늘 방문자 집계 조회
 */
export async function GET(req: NextRequest) {
  try {
    const siteId = req.nextUrl.searchParams.get("site_id");
    if (!siteId) {
      return NextResponse.json({ error: "site_id 필수" }, { status: 400 });
    }

    const srv = serviceClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await srv
      .from("visitor_count")
      .select("*")
      .eq("site_id", siteId)
      .eq("visit_date", today)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/visitor-count
 * body: { site_id, column_name, delta }
 * 카운트 증감
 */
export async function POST(req: NextRequest) {
  try {
    const { site_id, column_name, delta } = await req.json();

    if (!site_id || !column_name) {
      return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
    }

    const srv = serviceClient();

    const { error } = await srv.rpc("increment_visit_count", {
      p_site_id: site_id,
      p_column_name: column_name,
      p_delta: delta || 0,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
