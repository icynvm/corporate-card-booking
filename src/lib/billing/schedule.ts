/**
 * Pure date/amount helpers for billing schedules.
 * No I/O and no timezone-dependent Date parsing: everything works on
 * (year, month, day) integers so results are identical in every TZ.
 */

export interface DateOnly {
  y: number;
  m: number; // 1-12
  d: number; // 1-31
}

/** Accepts "YYYY-MM-DD" or a full ISO string; only the date part is used. */
export function parseDateOnly(s: string): DateOnly {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s ?? "").trim());
  if (!match) throw new Error(`Invalid date: ${s}`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) throw new Error(`Invalid date: ${s}`);
  return { y, m, d };
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month = last day of this month (UTC, no TZ effects)
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Inclusive list of "YYYY-MM" between the months of start and end. */
export function monthsInRange(start: string, end: string): string[] {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  const months: string[] = [];
  let y = s.y;
  let m = s.m;
  while (y < e.y || (y === e.y && m <= e.m)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

/** "YYYY-MM-DD" for the given month, day clamped to the month's last day. */
export function dueDateForMonth(startDay: number, year: number, month: number): string {
  const day = Math.min(Math.max(1, Math.floor(startDay)), daysInMonth(year, month));
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Splits total into n amounts (2 decimals) summing exactly to total; remainder goes on the last. */
export function splitAmount(total: number, n: number): number[] {
  if (!Number.isFinite(total) || !Number.isInteger(n) || n <= 0) return [];
  const totalCents = Math.round(total * 100);
  const base = Math.floor(totalCents / n);
  const amounts = new Array<number>(n).fill(base);
  amounts[n - 1] = totalCents - base * (n - 1);
  return amounts.map((c) => c / 100);
}
