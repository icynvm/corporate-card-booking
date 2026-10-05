import { createHash } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  const orig = process.env.APPROVAL_SECRET;
  afterEach(() => {
    if (orig === undefined) delete process.env.APPROVAL_SECRET;
    else process.env.APPROVAL_SECRET = orig;
  });

  it("hash/verify roundtrip", async () => {
    const h = await hashPassword("hunter2-รหัส");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("hunter2-รหัส", h)).toEqual({ valid: true, needsRehash: false });
  });

  it("rejects wrong password", async () => {
    const h = await hashPassword("right");
    expect(await verifyPassword("wrong", h)).toEqual({ valid: false, needsRehash: false });
  });

  it("salts: same password hashes differ", async () => {
    expect(await hashPassword("x")).not.toBe(await hashPassword("x"));
  });

  it("accepts legacy sha256 hash with default secret and flags rehash", async () => {
    delete process.env.APPROVAL_SECRET;
    const legacy = createHash("sha256").update("pw" + "dev-session-secret-key-2024").digest("hex");
    expect(await verifyPassword("pw", legacy)).toEqual({ valid: true, needsRehash: true });
    expect((await verifyPassword("nope", legacy)).valid).toBe(false);
  });

  it("accepts legacy sha256 hash with APPROVAL_SECRET", async () => {
    process.env.APPROVAL_SECRET = "custom";
    const legacy = createHash("sha256").update("pw" + "custom").digest("hex");
    expect(await verifyPassword("pw", legacy)).toEqual({ valid: true, needsRehash: true });
  });

  it("rejects garbage stored values", async () => {
    expect((await verifyPassword("a", "")).valid).toBe(false);
    expect((await verifyPassword("a", "plaintext")).valid).toBe(false);
    expect((await verifyPassword("a", "scrypt$bad")).valid).toBe(false);
  });
});
