import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let rpcResult: { data: unknown; error: { message: string } | null } | "throw" = { data: true, error: null };
const rpc = vi.fn(async () => {
  if (rpcResult === "throw") throw new Error("boom");
  return rpcResult;
});
vi.mock("@/lib/supabase", () => ({ createServerSupabase: () => ({ rpc }) }));

import { rateLimit, clientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    rpc.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("allows when rpc returns true", async () => {
    rpcResult = { data: true, error: null };
    expect(await rateLimit("k", 5, 60)).toEqual({ allowed: true });
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", { p_key: "k", p_limit: 5, p_window_seconds: 60 });
  });
  it("blocks when rpc returns false", async () => {
    rpcResult = { data: false, error: null };
    expect(await rateLimit("k", 5, 60)).toEqual({ allowed: false, retryAfter: 60 });
  });
  it("fails open on rpc error", async () => {
    rpcResult = { data: null, error: { message: "missing fn" } };
    expect(await rateLimit("k", 5, 60)).toEqual({ allowed: true });
  });
  it("fails open on thrown error", async () => {
    rpcResult = "throw";
    expect(await rateLimit("k", 5, 60)).toEqual({ allowed: true });
  });
});

describe("clientIp", () => {
  const mk = (h: Record<string, string>) => new NextRequest("http://localhost/x", { headers: h });
  it("takes first x-forwarded-for entry", () => {
    expect(clientIp(mk({ "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip then unknown", () => {
    expect(clientIp(mk({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(mk({}))).toBe("unknown");
  });
});
