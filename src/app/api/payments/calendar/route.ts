import { NextResponse } from "next/server";
import { PaymentService } from "@/services/payment.service";

/**
 * GET /api/payments/calendar?year=2024&month=12
 * 
 * Returns all payment installments for a given month and year.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

    const payments = await PaymentService.getPaymentsByMonth(year, month);
    
    return NextResponse.json(payments);
  } catch (error: any) {
    console.error("Calendar Fee Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
