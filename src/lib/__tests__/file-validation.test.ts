import { describe, expect, it } from "vitest";
import {
  detectFileType,
  sanitizeFileName,
  isSafePathSegment,
  contentDispositionInline,
} from "@/lib/file-validation";

const bytes = (...n: number[]) => new Uint8Array(n);

describe("detectFileType", () => {
  it("detects PDF, JPEG, PNG", () => {
    expect(detectFileType(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
  });
  it("rejects HTML, empty and truncated", () => {
    expect(detectFileType(new TextEncoder().encode("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectFileType(new Uint8Array(0))).toBeNull();
    expect(detectFileType(bytes(0x89, 0x50, 0x4e))).toBeNull();
  });
});

describe("sanitizeFileName", () => {
  it("strips traversal", () => {
    const s = sanitizeFileName("../../etc/passwd");
    expect(s).not.toMatch(/[/\\]/);
    expect(s).toBe("_.._etc_passwd"); // ".." is inert once separators are gone
    expect(s.startsWith(".")).toBe(false);
  });
  it("replaces quotes and leading dots", () => {
    expect(sanitizeFileName('a"b.pdf')).toBe("a_b.pdf");
    expect(sanitizeFileName("...hidden")).toBe("hidden");
  });
  it("caps length and falls back", () => {
    expect(sanitizeFileName("a".repeat(500)).length).toBe(100);
    expect(sanitizeFileName("a".repeat(500), 10).length).toBe(10);
    expect(sanitizeFileName("")).toBe("file");
    expect(sanitizeFileName("...")).toBe("file");
  });
  it("contentDisposition has no raw quotes in filename", () => {
    expect(contentDispositionInline('x"y.pdf')).toBe('inline; filename="x_y.pdf"');
  });
});

describe("isSafePathSegment", () => {
  it("accepts plain segments", () => {
    expect(isSafePathSegment("abc-123.pdf")).toBe(true);
  });
  it.each(["", "a/b", "a\\b", "..", "a..b", "a\0b"])("rejects %j", (s) => {
    expect(isSafePathSegment(s)).toBe(false);
  });
});
