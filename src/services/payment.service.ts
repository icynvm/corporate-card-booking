import { createServerSupabase } from "@/lib/supabase";
import { RequestPayment, RequestRecord } from "@/lib/types";
import { sendLineNotification } from "@/lib/line";
import { BillingType, RequestStatus } from "@/types/enums";

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

    // 3. Generate virtual events for ONE_TIME, MONTHLY, YEARLY, YEARLY_MONTHLY types
    // Pass explicitPayments for deduplication
    const virtualEvents = this.generateVirtualEvents(approvedRequests as RequestRecord[], year, month, explicitPayments);

    // 4. Merge and return
    return this.mergeAndSortPayments(explicitPayments as (RequestPayment & { requests: RequestRecord })[], virtualEvents);
  }

  /**
   * Calculates virtual payment dates for requests that aren't in request_payments table.
   */
  private static generateVirtualEvents(requests: RequestRecord[], year: number, month: number, explicitPayments: any[]) {
    const events: any[] = [];
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    for (const req of requests) {
      if (!req.start_date) continue;

      // Deduplication: If a record already exists in the database for this request/month, skip virtual generation
      const exists = explicitPayments.find(p => p.request_id === req.id && p.month_year === monthStr);
      if (exists) continue;

      const startDate = new Date(req.start_date);
      const endDate = req.end_date ? new Date(req.end_date) : null;
      const billingType = req.billing_type as BillingType;

      // Calculate due day (day part of start_date)
      const dueDay = startDate.getDate();
      const currentMonthDueDate = new Date(year, month - 1, dueDay);

      // Validate if the due date falls within the request's active period
      if (currentMonthDueDate < startDate) continue;
      if (endDate && currentMonthDueDate > endDate) continue;

      let isDueThisMonth = false;

      if (billingType === BillingType.ONE_TIME) {
        // Only if start_date is in this month
        isDueThisMonth = startDate.getMonth() === (month - 1) && startDate.getFullYear() === year;
      } else if (billingType === BillingType.MONTHLY || billingType === BillingType.YEARLY_MONTHLY) {
        // Every month within period
        isDueThisMonth = true;
      } else if (billingType === BillingType.YEARLY) {
        // Only if startMonth matches
        isDueThisMonth = startDate.getMonth() === (month - 1);
      }

      if (isDueThisMonth) {
        events.push({
          id: `virtual:${req.id}:${year}:${month}`,
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

    if (paymentId.startsWith("virtual:")) {
      // Handle virtual notification (no record in DB)
      // Extract request ID from "virtual:{reqId}:{year}:{month}"
      const parts = paymentId.split(":");
      const reqId = parts[1];
      const year = parts[2];
      const month = parts[3];

      const { data: request, error } = await supabase
        .from("requests")
        .select("*, profiles(*)")
        .eq("id", reqId)
        .single();

      if (error || !request) throw new Error("Request not found: " + reqId);

      paymentData = {
        requests: request,
        amount_due: (request as any).amount,
        month_year: `${year}-${month}`,
        status: "PENDING",
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

    const { requests: request, amount_due, month_year, status } = paymentData;
    const profile = request.profiles;
    const monthLabel = this.formatMonthYear(month_year);

    // 2. Compose Rich Flex Message
    const flexMessage = this.createPaymentFlexMessage({
      projectName: request.project_name,
      monthLabel,
      amount: amount_due,
      userName: profile?.name || "N/A",
      status: status || "PENDING"
    });

    // 3. Send notification
    await sendLineNotification(flexMessage);

    return { success: true, sentTo: profile?.name };
  }

  private static createPaymentFlexMessage(data: { 
    projectName: string; 
    monthLabel: string; 
    amount: number; 
    userName: string; 
    status: string; 
  }) {
    const isOverdue = data.status === "OVERDUE";
    const headerColor = isOverdue ? "#EF4444" : "#2563EB"; // Red for overdue, Blue for pending
    
    return {
      type: "flex",
      altText: `แจ้งเตือนการชำระเงิน: ${data.projectName}`,
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "แจ้งเตือนการชำระรอบบิล",
              weight: "bold",
              color: "#ffffff",
              size: "sm"
            }
          ],
          backgroundColor: headerColor
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: data.projectName,
              weight: "bold",
              size: "md",
              wrap: true
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "เดือน", size: "xs", color: "#aaaaaa", flex: 0 },
                    { type: "text", text: data.monthLabel, size: "xs", color: "#666666", align: "end" }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ยอดชำระ", size: "xs", color: "#aaaaaa", flex: 0 },
                    { type: "text", text: `${data.amount.toLocaleString()} บาท`, size: "xs", color: "#666666", align: "end", weight: "bold" }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ผู้รับผิดชอบ", size: "xs", color: "#aaaaaa", flex: 0 },
                    { type: "text", text: data.userName, size: "xs", color: "#666666", align: "end" }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: {
                type: "uri",
                label: "ตรวจสอบในระบบ",
                uri: "https://line.me" // Placeholder: should be APP_URL
              },
              style: "primary",
              color: headerColor,
              height: "sm"
            }
          ]
        }
      }
    };
  }

  private static formatMonthYear(my: string) {
    const [y, m] = my.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }
}
