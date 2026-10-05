import { NextRequest, NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";
import { requireSession } from "@/lib/auth";

/**
 * POST /api/payments/notify
 * 
 * Triggers a manual LINE notification for a specific `request_payment` ID.
 * Restricted to admin/manager.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireSession(req, { roles: ["admin", "manager"] });
    if ("response" in auth) return auth.response;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing Payment ID" }, { status: 400 });

    const result = await PaymentService.notifyPayment(id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Notify Payment Error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
