import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { PaymentService } from "@/services/payment.service";

/**
 * GET /api/payments/cron/reminders
 * 
 * This endpoint is designed to be called by a daily cron job (e.g. Vercel Cron, GitHub Actions).
 * It automatically scans for payments due in exactly 14 days and sends LINE notifications.
 */
export async function GET(req: Request) {
  try {
    // 1. Security Check: Validate Cron Secret
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Fail closed: the secret must be configured
    if (!cronSecret) {
      console.error("CRON_SECRET not configured");
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    const expected = Buffer.from(`Bearer ${cronSecret}`);
    const provided = Buffer.from(authHeader || "");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Execute automated reminders (14 days ahead)
    const result = await PaymentService.runDailyAutoReminders(14);
    
    return NextResponse.json({
      message: "Cron job executed successfully",
      ...result
    });
  } catch (error) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

// Support POST as well for flexibility with various schedulers
export async function POST(req: Request) {
  return GET(req);
}
