import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/lib/utils/string";

describe("escapeHtml", () => {
  it("escapes special chars", () => {
    expect(escapeHtml(`<script>"'&`)).toBe("&lt;script&gt;&quot;&#39;&amp;");
  });
  it("handles null/undefined/numbers", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(5)).toBe("5");
  });
});
