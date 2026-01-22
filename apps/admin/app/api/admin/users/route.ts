import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
  const STATUS_ACTIVE = 1;
  const STATUS_INACTIVE = 0;


type AdminCode = "A" | "B" | "C" | "O";

type CreateBody = {
  user_id: string; // 문자열 ID (예: hwalk14)
  password: string;
  name: string;
  code: AdminCode;
  site_ids?: string[]; // C/O만 사용
};

type UpdateBody = {
  admin_uuid: string; // users_admin.uuid
  name?: string;
  code?: AdminCode;
  password?: string; // 변경 시에만
  site_ids?: string[]; // C/O만 사용
  user_id?: string; // 변경 금지(방어용)
};

type SoftDeleteBody = {
  admin_uuid: string;
};

function envOrThrow(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function normalizeCode(code: string): AdminCode {
  if (code === "A" || code === "B" || code === "C" || code === "O") return code;
  throw new Error("Invalid code");
}

function codeLabel(code: AdminCode) {
  switch (code) {
    case "A":
      return "Code Alpha";
    case "B":
      return "Code Bravo";
    case "C":
      return "Code Charlie";
    case "O":
      return "Code Oscar";
  }
}

async function requireMasterAdmin() {
  const supabaseUrl = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const cookieStore = cookies();

  // 1) 현재 요청이 "로그인된 사용자"인지 확인(쿠키 기반 세션)
  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_name: string, _value: string, _options: any) {},
      remove(_name: string, _options: any) {},
    },
  });

  const { data, error: authErr } = await authClient.auth.getUser();
  const authUser = data?.user;

  if (authErr || !authUser) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }

  // 2) users_admin 프로필 조회는 service role로(=RLS 영향 제거)
  const srv = serviceClient();

  const { data: me, error: meErr } = await srv
    .from("users_admin")
    .select("uuid, code, status, auth_uid")
    .eq("auth_uid", authUser.id)
    .eq("status", STATUS_ACTIVE)
    .maybeSingle();

  if (meErr) {
    return {
      ok: false as const,
      status: 500,
      message: `Failed to load admin profile: ${meErr.message}`,
    };
  }

  if (!me || (me.code !== "A" && me.code !== "B")) {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const, authClient, me, authUser };
}


function serviceClient() {
  const supabaseUrl = envOrThrow("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = envOrThrow("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * GET: 관리자 목록 조회
 * - users_admin + sites_auth + sites.name 조인해서 내려줌
 */
export async function GET() {
  try {
    const guard = await requireMasterAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const srv = serviceClient();

    const { data: admins, error: aErr } = await srv
      .from("users_admin")
      .select("uuid, user_id, name, code, status, auth_uid")
      .order("user_id", { ascending: true });

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const { data: maps, error: mErr } = await srv
      .from("sites_auth")
      .select("user_uuid, site_id, role, sites:site_id ( id, name, status )");

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

    const mapByUser = new Map<
      string,
      { site_id: string; site_name: string | null; role: string | null }[]
    >();

    for (const row of (maps ?? []) as any[]) {
      const u = row.user_uuid as string;
      const arr = mapByUser.get(u) ?? [];
      const site = row.sites as { id: string; name: string; status: string } | null;

      arr.push({
        site_id: row.site_id as string,
        site_name: site?.name ?? null,
        role: (row.role ?? null) as string | null,
      });
      mapByUser.set(u, arr);
    }

    const result = ((admins ?? []) as any[]).map((a) => {
      const code = a.code as AdminCode;
      const links = mapByUser.get(a.uuid) ?? [];

      const activeSites = links
        .filter((x) => x.site_name)
        .map((x) => ({ id: x.site_id, name: x.site_name!, role: x.role }));

      let site_summary = "Master";
      if (code === "C" || code === "O") {
        if (activeSites.length === 0) site_summary = "-";
        else if (activeSites.length === 1) site_summary = activeSites[0].name;
        else site_summary = `${activeSites[0].name} 외 ${activeSites.length - 1}`;
      }

      return {
        uuid: a.uuid,
        user_id: a.user_id,
        name: a.name,
        code,
        code_label: codeLabel(code),
        status: a.status === STATUS_ACTIVE ? "active" : "inactive",
        auth_uid: a.auth_uid,
        sites: activeSites,
        site_summary,
      };
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * POST: 관리자 생성 (Auth 유저 생성 + users_admin insert + (C/O면) sites_auth 매핑)
 */
export async function POST(req: Request) {
  try {
    const guard = await requireMasterAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const body = (await req.json()) as CreateBody;

    const user_id = (body.user_id ?? "").trim();
    const password = body.password ?? "";
    const name = (body.name ?? "").trim();
    const code = normalizeCode((body.code ?? "").trim());
    const site_ids = Array.isArray(body.site_ids) ? body.site_ids.filter(Boolean) : [];

    if (!user_id || user_id.length < 2) {
      return NextResponse.json({ error: "user_id is required (min 2 chars)" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "password is required (min 6 chars)" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const cleanId = user_id.includes("@") ? user_id.split("@")[0] : user_id;
    const email = `${cleanId}@aplan.apex`;


    const srv = serviceClient();

    // 1) Auth 유저 생성
    const { data: created, error: cErr } = await srv.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (cErr || !created?.user) {
      return NextResponse.json({ error: cErr?.message ?? "Failed to create auth user" }, { status: 500 });
    }

    const auth_uid = created.user.id;

    // 2) users_admin insert
    const { data: adminRow, error: iErr } = await srv
      .from("users_admin")
      .insert({
        uuid: auth_uid,
        user_id: email,
        name,
        code,
        status: STATUS_ACTIVE,
        auth_uid,
      })
      .select("uuid, user_id, name, code, status, auth_uid")
      .single();

    if (iErr || !adminRow) {
      // 롤백: Auth 유저 삭제
      try { await srv.auth.admin.deleteUser(auth_uid); } catch {}
      return NextResponse.json({ error: iErr?.message ?? "Failed to insert users_admin" }, { status: 500 });
    }

    // 3) sites_auth 매핑 (C/O만)
    if ((code === "C" || code === "O") && site_ids.length > 0) {
      const payload = site_ids.map((site_id) => ({
        site_id,
        user_uuid: adminRow.uuid,
        role: code, // 형 요구대로 C/O 그대로
      }));

      const { error: sErr } = await srv.from("sites_auth").insert(payload);
      if (sErr) {
        // 롤백: users_admin 삭제 + auth 삭제
        const { error: rbErr } = await srv.from("users_admin").delete().eq("uuid", adminRow.uuid);
        if (rbErr) {
          // 롤백 실패는 무시(원하면 console.error)
        }
        try { await srv.auth.admin.deleteUser(auth_uid); } catch {}
        return NextResponse.json({ error: sErr.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      {
        data: {
          ...adminRow,
          code_label: codeLabel(code),
          email,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * PUT: 관리자 수정
 * - user_id 변경 금지
 * - name/code 변경
 * - password 있으면 Auth 비번 변경
 * - C/O면 sites_auth 매핑 동기화(삭제 후 재삽입)
 */
export async function PUT(req: Request) {
  try {
    const guard = await requireMasterAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const body = (await req.json()) as UpdateBody;

    const admin_uuid = (body.admin_uuid ?? "").trim();
    if (!admin_uuid) return NextResponse.json({ error: "admin_uuid is required" }, { status: 400 });

    const srv = serviceClient();

    const { data: before, error: bErr } = await srv
      .from("users_admin")
      .select("uuid, user_id, name, code, status, auth_uid")
      .eq("uuid", admin_uuid)
      .single();

    if (bErr || !before) return NextResponse.json({ error: bErr?.message ?? "Not found" }, { status: 404 });

    if (body.user_id && body.user_id.trim() !== before.user_id) {
      return NextResponse.json({ error: "user_id cannot be changed" }, { status: 400 });
    }

    const patch: Record<string, any> = {};

    if (typeof body.name === "string") {
      const nm = body.name.trim();
      if (!nm) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
      patch.name = nm;
    }

    let nextCode: AdminCode = before.code as AdminCode;
    if (typeof body.code === "string") {
      nextCode = normalizeCode(body.code.trim());
      patch.code = nextCode;
    }

    if (Object.keys(patch).length > 0) {
      const { error: uErr } = await srv.from("users_admin").update(patch).eq("uuid", admin_uuid);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    // 비번 변경(선택)
    if (body.password) {
      const pw = body.password;
      if (pw.length < 6) return NextResponse.json({ error: "password min 6 chars" }, { status: 400 });
      if (!before.auth_uid) return NextResponse.json({ error: "auth_uid missing" }, { status: 500 });

      const { error: pErr } = await srv.auth.admin.updateUserById(before.auth_uid, { password: pw });
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    }

    const inputSiteIds = Array.isArray(body.site_ids) ? body.site_ids.filter(Boolean) : [];

    if (nextCode === "A" || nextCode === "B") {
      const { error: dErr } = await srv.from("sites_auth").delete().eq("user_uuid", admin_uuid);
      if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
    } else {
      // C/O
      const { error: dErr } = await srv.from("sites_auth").delete().eq("user_uuid", admin_uuid);
      if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

      if (inputSiteIds.length > 0) {
        const payload = inputSiteIds.map((site_id) => ({
          site_id,
          user_uuid: admin_uuid,
          role: nextCode, // C 또는 O
        }));
        const { error: insErr } = await srv.from("sites_auth").insert(payload);
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    const { data: after, error: aErr } = await srv
      .from("users_admin")
      .select("uuid, user_id, name, code, status, auth_uid")
      .eq("uuid", admin_uuid)
      .single();

    if (aErr || !after) return NextResponse.json({ error: aErr?.message ?? "Failed to reload" }, { status: 500 });

    return NextResponse.json(
      {
        data: {
          ...after,
          code_label: codeLabel(after.code as AdminCode),
          email: `${after.user_id}@aplan.apex`,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

/**
 * PATCH: 소프트 삭제(status='inactive')
 */
export async function PATCH(req: Request) {
  try {
    const guard = await requireMasterAdmin();
    if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.status });

    const body = (await req.json()) as SoftDeleteBody;
    const admin_uuid = (body.admin_uuid ?? "").trim();
    if (!admin_uuid) return NextResponse.json({ error: "admin_uuid is required" }, { status: 400 });

    const srv = serviceClient();

    const { error: uErr } = await srv.from("users_admin").update({ status: STATUS_INACTIVE }).eq("uuid", admin_uuid);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
