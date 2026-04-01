import { createServerSupabase } from "@/lib/supabase";
import { RequestPayment, RequestRecord } from "@/lib/types";
import { sendLineNotification } from "@/lib/line";

export class PaymentService {
  /**
   * Fetches all payments (explicit installments + virtual events) for a specific month.
   */
  static async getPaymentsByMonth(year: number, month: number) {
    const supabase = createServerSupabase();
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    
    // 1. Fetch explicit installments from request_payments
    const { data: explicitPayments, error: expErr } = await supabase
      .from("request_payments")
      .select("*, requests(*, profiles(*))")
      .eq("month_year", monthStr);

    if (expErr) throw expErr;

    // 2. Fetch all APPROVED/ACTIVE requests to calculate virtual installments
    const { data: approvedRequests, error: appErr } = await supabase
      .from("requests")
      .select("*, profiles(*)")
      .in("status", ["APPROVED", "ACTIVE"]);

    if (appErr) throw appErr;

    // 3. Generate virtual events for ONE_TIME, MONTHLY, YEARLY types
    const virtualEvents = this.generateVirtualEvents(approvedRequests as RequestRecord[], year, month);

    // 4. Merge and return
    return this.mergeAndSortPayments(explicitPayments as (RequestPayment & { requests: RequestRecord })[], virtualEvents);
  }

  /**
   * Calculates virtual payment dates for requests that aren't in request_payments table.
   */
  private static generateVirtualEvents(requests: RequestRecord[], year: number, month: number) {
    const events: any[] = [];
    const targetMonthStart = new Date(year, month - 1, 1);
    const targetMonthEnd = new Date(year, month, 0);

    for (const req of requests) {
      if (!req.start_date) continue;

      const startDate = new Date(req.start_date);
      const endDate = req.end_date ? new Date(req.end_date) : null;
      const billingType = req.billing_type;

      // Skip if billing type is YEARLY_MONTHLY (they are in the explicit table)
      if (billingType === "YEARLY_MONTHLY") continue;

      // Calculate due day (day part of start_date)
      const dueDay = startDate.getDate();
      const currentMonthDueDate = new Date(year, month - 1, dueDay);

      // Validate if the due date falls within the request's active period
      if (currentMonthDueDate < startDate) continue;
      if (endDate && currentMonthDueDate > endDate) continue;

      let isDueThisMonth = false;

      if (billingType === "ONE_TIME") {
        // Only if start_date is in this month
        isDueThisMonth = startDate.getMonth() === (month - 1) && startDate.getFullYear() === year;
      } else if (billingType === "MONTHLY") {
        // Every month within period
        isDueThisMonth = true;
      } else if (billingType === "YEARLY") {
        // Only if startMonth matches
        isDueThisMonth = startDate.getMonth() === (month - 1);
      }

      if (isDueThisMonth) {
        events.push({
          id: `virtual-${req.id}-${year}-${month}`,
          request_id: req.id,
          amount_due: req.amount,
          month_year: `${year}-${String(month).padStart(2, "0")}`,
          status: "PENDING", // Virtual events always start as PENDING on calendar
          due_date: currentMonthDueDate.toISOString(),
          requests: req,
          is_virtual: true
        });
      }
    }
    return events;
  }

  private static mergeAndSortPayments(explicit: any[], virtual: any[]) {
    // Merge both lists
    const all = [...explicit, ...virtual];
    
    // Sort by due_date (day of month)
    return all.sort((a, b) => {
      const dayA = a.due_date ? new Date(a.due_date).getDate() : 1;
      const dayB = b.due_date ? new Date(b.due_date).getDate() : 1;
      return dayA - dayB;
    });
  }

  /**
   * Triggers a manual LINE notification for a specific payment.
   */
  static async notifyPayment(paymentId: string) {
    const supabase = createServerSupabase();
    let paymentData: any = null;

    if (paymentId.startsWith("virtual-")) {
      // Handle virtual notification (no record in DB)
      // Extract request ID from "virtual-{reqId}-{year}-{month}"
      const parts = paymentId.split("-");
      const reqId = parts[1];
      const year = parts[2];
      const month = parts[3];

      const { data: request, error } = await supabase
        .from("requests")
        .select("*, profiles(*)")
        .eq("id", reqId)
        .single();

      if (error || !request) throw new Error("Request not found");

      paymentData = {
        requests: request,
        amount_due: (request as any).amount,
        month_year: `${year}-${month}`,
        is_virtual: true
      };
    } else {
      // Fetch explicit payment with request and profile details
      const { data: p, error } = await supabase
        .from("request_payments")
        .select("*, requests(*, profiles(*))")
        .eq("id", paymentId)
        .single();
      if (error || !p) throw new Error("Payment record not found");
      paymentData = p;
    }

    const { requests: request, amount_due, month_year } = paymentData;
    const profile = request.profiles;
    const monthLabel = this.formatMonthYear(month_year);

    // 2. Compose notification message
    const message = `🔔 *แจ้งเตือนการชำระรอบบิล*\n\n` +
      `📌 โปรเจกต์: ${request.project_name}\n` +
      `📅 รอบเดือน: ${monthLabel}\n` +
      `💰 ยอดที่ต้องชำระ: ${amount_due.toLocaleString()} บาท\n` +
      `👤 ผู้รับผิดชอบ: ${profile?.name || "N/A"}\n\n` +
      `กรุณาตรวจสอบและดำเนินการอัปโหลดหลักฐานการชำระเงินในระบบด้วยครับ 🙏`;

    // 3. Send notification
    await sendLineNotification(message);

    return { success: true, sentTo: profile?.name };
  }

  private static formatMonthYear(my: string) {
    const [y, m] = my.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }
}
