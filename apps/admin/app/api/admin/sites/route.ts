import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function serviceClient() {
  const supabaseUrl = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = envOrThrow("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function requireAdmin() {
  const supabaseUrl = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const cookieStore = cookies();

  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });

  const { data, error } = await authClient.auth.getUser();
  const user = data?.user;

  if (error || !user) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }

  const srv = serviceClient();

  const { data: admin, error: aErr } = await srv
    .from("users_admin")
    .select("uuid, code, status")
    .eq("auth_uid", user.id)
    .eq("status", 1)
    .maybeSingle();

  if (aErr) {
    return {
      ok: false as const,
      status: 500,
      message: `Failed to load admin profile: ${aErr.message}`,
    };
  }

  if (!admin) {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const, admin };
}

/**
 * GET /api/admin/sites
 * - 관리자(A/B/C/O)만 접근 가능
 * - 현장 매핑용 최소 데이터만 반환
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return NextResponse.json({ error: guard.message }, { status: guard.status });
    }

    const srv = serviceClient();

    const { data, error } = await srv
      .from("sites")
      .select("id, name, status")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        data: (data ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status,
        })),
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
