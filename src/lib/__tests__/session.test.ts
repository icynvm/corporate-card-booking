import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  parseSessionToken,
  generateOTP,
  sessionCookieOptions,
  SESSION_TTL_SECONDS,
} from "@/lib/session";

const profile = { id: "p1", email: "a@b.co", role: "user", name: "สมชาย ใจดี", department: "ฝ่ายขาย" };

function b64u(s: string) {
  return Buffer.from(s, "utf8").toString("base64url");
}

describe("session", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "secret-one";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("roundtrips incl. Thai name", async () => {
    const t = await createSessionToken(profile);
    const p = await parseSessionToken(t);
    expect(p).toEqual({ pid: "p1", email: "a@b.co", role: "user", name: "สมชาย ใจดี", department: "ฝ่ายขาย" });
  });

  it("rejects tampered payload with original signature", async () => {
    const t = await createSessionToken(profile);
    const [payload, sig] = t.split(".");
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    obj.role = "admin";
    const forged = `${b64u(JSON.stringify(obj))}.${sig}`;
    expect(await parseSessionToken(forged)).toBeNull();
  });

  it("rejects token signed with a different secret", async () => {
    const t = await createSessionToken(profile);
    process.env.SESSION_SECRET = "secret-two";
    expect(await parseSessionToken(t)).toBeNull();
    process.env.SESSION_SECRET = "secret-one";
    expect(await parseSessionToken(t)).not.toBeNull();
  });

  it("rejects expired tokens", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const t = await createSessionToken(profile);
    vi.setSystemTime(new Date(Date.now() + (SESSION_TTL_SECONDS - 10) * 1000));
    expect(await parseSessionToken(t)).not.toBeNull();
    vi.setSystemTime(new Date(Date.now() + 11 * 1000));
    expect(await parseSessionToken(t)).toBeNull();
  });

  it.each(["", "abc", "a.b.c", ".", "a.", ".b", "!!!.???", "e30.e30"])("rejects malformed %j", async (s) => {
    expect(await parseSessionToken(s)).toBeNull();
  });

  it("rejects non-string input", async () => {
    expect(await parseSessionToken(undefined as unknown as string)).toBeNull();
  });

  it("generateOTP is always 6 digits", () => {
    for (let i = 0; i < 2000; i++) expect(generateOTP()).toMatch(/^[1-9]\d{5}$/);
  });

  it("cookie maxAge equals TTL", () => {
    expect(sessionCookieOptions().maxAge).toBe(SESSION_TTL_SECONDS);
    expect(sessionCookieOptions().httpOnly).toBe(true);
  });
});
