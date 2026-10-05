import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let profile: { role: string } | null = null;
vi.mock("@/lib/supabase", () => ({
  createServerSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }),
      }),
    }),
  }),
}));

import { requireSession } from "@/lib/auth";
import { createSessionToken, getSessionCookieName } from "@/lib/session";

const base = { id: "p1", email: "a@b.co", name: "n", department: "d" };
const reqWith = (cookie?: string) =>
  new NextRequest("http://localhost/api/x", {
    headers: cookie ? { cookie: `${getSessionCookieName()}=${cookie}` } : {},
  });

describe("requireSession", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "auth-test-secret";
    profile = null;
  });

  it("401 without cookie", async () => {
    const r = await requireSession(reqWith());
    expect("response" in r && r.response.status).toBe(401);
  });

  it("401 for forged/unsigned cookie", async () => {
    const payload = Buffer.from(JSON.stringify({ pid: "p1", role: "admin", exp: 9999999999 })).toString("base64url");
    for (const c of [payload, `${payload}.AAAA`, "garbage"]) {
      const r = await requireSession(reqWith(c));
      expect("response" in r && r.response.status).toBe(401);
    }
  });

  it("DB role wins over token role (403)", async () => {
    const token = await createSessionToken({ ...base, role: "admin" });
    profile = { role: "user" };
    const r = await requireSession(reqWith(token), { roles: ["admin"] });
    expect("response" in r && r.response.status).toBe(403);
  });

  it("allows when DB role is admin and refreshes session.role", async () => {
    const token = await createSessionToken({ ...base, role: "user" });
    profile = { role: "admin" };
    const r = await requireSession(reqWith(token), { roles: ["admin"] });
    expect("session" in r && r.session.role).toBe("admin");
  });

  it("403 when profile is missing", async () => {
    const token = await createSessionToken({ ...base, role: "admin" });
    profile = null;
    const r = await requireSession(reqWith(token), { roles: ["admin"] });
    expect("response" in r && r.response.status).toBe(403);
  });

  it("no roles option: valid token passes without DB lookup", async () => {
    const token = await createSessionToken({ ...base, role: "user" });
    const r = await requireSession(reqWith(token));
    expect("session" in r && r.session.pid).toBe("p1");
  });
});
