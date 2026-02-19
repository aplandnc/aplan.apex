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
 * POST /api/visit
 * body: { site_id, guest_name, phone, visit_type, visit_cnt, staff_uuid? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { site_id, guest_name, phone, visit_type, visit_cnt, staff_uuid } = body;

    if (!site_id || !guest_name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
    }

    if (!staff_uuid) {
      return NextResponse.json({ error: "담당직원을 선택해주세요" }, { status: 400 });
    }

    const srv = serviceClient();
    const phoneDigits = phone.replace(/\D/g, "");
    const phoneIndex = phoneDigits.slice(-4);

    const { error } = await srv.from("visitor_guest").insert({
      site_id,
      visit_date: new Date().toISOString().slice(0, 10),
      visit_type: visit_type || "지명",
      guest_name: guest_name.trim(),
      phone: phone.trim(),
      phone_index: phoneIndex,
      visit_cnt: visit_cnt || 1,
      staff_uuid: staff_uuid || null,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * PUT /api/visit
 * body: { id, site_id, guest_name, phone, visit_type, visit_cnt, staff_uuid? }
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, site_id, guest_name, phone, visit_type, visit_cnt, staff_uuid } = await req.json();

    if (!id || !site_id) {
      return NextResponse.json({ error: "id, site_id 필수" }, { status: 400 });
    }

    const srv = serviceClient();
    const phoneDigits = (phone || "").replace(/\D/g, "");
    const phoneIndex = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : phoneDigits;

    const { error } = await srv
      .from("visitor_guest")
      .update({
        guest_name: guest_name?.trim(),
        phone: phone?.trim(),
        phone_index: phoneIndex,
        visit_type,
        visit_cnt,
        staff_uuid: staff_uuid || null,
      })
      .eq("id", id)
      .eq("site_id", site_id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/visit
 * body: { id, site_id }
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id, site_id } = await req.json();

    if (!id || !site_id) {
      return NextResponse.json({ error: "id, site_id 필수" }, { status: 400 });
    }

    const srv = serviceClient();

    const { error } = await srv
      .from("visitor_guest")
      .delete()
      .eq("id", id)
      .eq("site_id", site_id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}