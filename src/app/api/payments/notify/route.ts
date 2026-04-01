import { NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";

/**
 * POST /api/payments/notify
 * 
 * Triggers a manual LINE notification for a specific `request_payment` ID.
 */
export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing Payment ID" }, { status: 400 });

    const result = await PaymentService.notifyPayment(id);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Notify Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
