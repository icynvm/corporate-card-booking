import { describe, expect, it } from "vitest";
import { monthsInRange, dueDateForMonth, splitAmount, parseDateOnly } from "@/lib/billing/schedule";

describe("monthsInRange", () => {
  it("Jan 31 to May is 5 months", () => {
    expect(monthsInRange("2025-01-31", "2025-05-01")).toEqual(["2025-01", "2025-02", "2025-03", "2025-04", "2025-05"]);
  });
  it("cross-year", () => {
    expect(monthsInRange("2024-11-15", "2025-02-10")).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
  });
  it("single month and reversed range", () => {
    expect(monthsInRange("2025-03-01", "2025-03-31")).toEqual(["2025-03"]);
    expect(monthsInRange("2025-05-01", "2025-03-01")).toEqual([]);
  });
});

describe("dueDateForMonth", () => {
  it("clamps", () => {
    expect(dueDateForMonth(31, 2025, 2)).toBe("2025-02-28");
    expect(dueDateForMonth(31, 2028, 2)).toBe("2028-02-29");
    expect(dueDateForMonth(31, 2025, 4)).toBe("2025-04-30");
    expect(dueDateForMonth(15, 2025, 4)).toBe("2025-04-15");
    expect(dueDateForMonth(0, 2025, 4)).toBe("2025-04-01");
  });
});

describe("splitAmount", () => {
  const cents = (a: number[]) => a.reduce((s, x) => s + Math.round(x * 100), 0);
  it.each([
    [100, 3],
    [1000.1, 7],
    [0, 5],
    [99.99, 1],
    [0.01, 3],
  ])("sums exactly %s / %s", (total, n) => {
    const parts = splitAmount(total, n);
    expect(parts).toHaveLength(n);
    expect(cents(parts)).toBe(Math.round(total * 100));
  });
  it("remainder on last", () => {
    expect(splitAmount(100, 3)).toEqual([33.33, 33.33, 33.34]);
  });
  it("invalid input", () => {
    expect(splitAmount(100, 0)).toEqual([]);
    expect(splitAmount(NaN, 3)).toEqual([]);
  });
});

describe("parseDateOnly", () => {
  it("uses date part only of ISO strings with offsets", () => {
    expect(parseDateOnly("2025-03-31T23:30:00+07:00")).toEqual({ y: 2025, m: 3, d: 31 });
    expect(parseDateOnly("2025-03-01T00:00:00Z")).toEqual({ y: 2025, m: 3, d: 1 });
    expect(parseDateOnly("2025-03-05")).toEqual({ y: 2025, m: 3, d: 5 });
  });
  it("throws on invalid", () => {
    expect(() => parseDateOnly("nope")).toThrow();
    expect(() => parseDateOnly("2025-13-01")).toThrow();
  });
});
