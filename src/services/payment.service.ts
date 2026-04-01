import { createServerSupabase } from "@/lib/supabase";
import { RequestPayment, RequestRecord } from "@/lib/types";
import { sendLineNotification } from "@/lib/line";

export class PaymentService {
  /**
   * Fetches all payments for a specific month range across all requests.
   */
  static async getPaymentsByMonth(year: number, month: number) {
    const supabase = createServerSupabase();
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    
    const { data, error } = await supabase
      .from("request_payments")
      .select("*, requests(*, profiles(*))")
      .eq("month_year", monthStr);

    if (error) throw error;
    return data as (RequestPayment & { requests: RequestRecord })[];
  }

  /**
   * Triggers a manual LINE notification for a specific payment.
   */
  static async notifyPayment(paymentId: string) {
    const supabase = createServerSupabase();
    
    // 1. Fetch payment with request and profile details
    const { data: payment, error } = await supabase
      .from("request_payments")
      .select("*, requests(*, profiles(*))")
      .eq("id", paymentId)
      .single();

    if (error || !payment) throw new Error("Payment record not found");

    const request = payment.requests;
    const profile = request.profiles;
    const monthLabel = this.formatMonthYear(payment.month_year);

    // 2. Compose notification message
    const message = `🔔 *แจ้งเตือนการชำระรอบบิล*\n\n` +
      `📌 โปรเจกต์: ${request.project_name}\n` +
      `📅 รอบเดือน: ${monthLabel}\n` +
      `💰 ยอดที่ต้องชำระ: ${payment.amount_due.toLocaleString()} บาท\n` +
      `👤 ผู้รับผิดชอบ: ${profile?.name || "N/A"}\n\n` +
      `กรุณาตรวจสอบและดำเนินการอัปโหลดหลักฐานการชำระเงินในระบบด้วยครับ 🙏`;

    // 3. Send notification
    await sendLineNotification(message);

    // 4. Update notified status (if we add a field for it later)
    return { success: true, sentTo: profile?.name };
  }

  private static formatMonthYear(my: string) {
    const [y, m] = my.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }
}
