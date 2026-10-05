import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import { requireSession, isPrivileged } from "@/lib/auth";

const SENSITIVE_KEYS = new Set(["password_hash", "fb_access_token"]);

/** Recursively drop sensitive keys from nested objects (defensive). */
function stripSensitive(value: any): any {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = stripSensitive(v);
    }
    return out;
  }
  return value;
}

/**
 * GET /api/payments/calendar?year=2024&month=12
 * 
 * Returns payment installments for a given month and year.
 * Admin/manager see all; other users see only their own requests' payments.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireSession(req, { freshRole: true });
    if ("response" in auth) return auth.response;
    const { session } = auth;

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);

    if (!Number.isInteger(year) || year < 2000 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
    }

    let payments: any[] = await PaymentService.getPaymentsByMonth(year, month);

    if (!isPrivileged(session)) {
      payments = payments.filter((p) => p.requests?.user_id === session.pid);
    }

    return NextResponse.json(stripSensitive(payments));
  } catch (error) {
    console.error("Calendar Fee Error:", error);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
}
