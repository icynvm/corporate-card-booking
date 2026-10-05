import { createServerSupabase } from "@/lib/supabase";
import { RequestPayment, RequestRecord } from "@/lib/types";
import { sendLineNotification, buildAppUrl } from "@/lib/line";
import { parseDateOnly, dueDateForMonth } from "@/lib/billing/schedule";
import { BillingType, RequestStatus } from "@/types/enums";

const BUSINESS_TZ = process.env.BUSINESS_TZ || "Asia/Bangkok";

/** Today's calendar date (YYYY-MM-DD) in the business timezone. */
function todayInBusinessTz(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Adds N days to a YYYY-MM-DD string using UTC arithmetic (no TZ/DST effects). */
function addDaysToDateString(dateStr: string, days: number): string {
  const { y, m, d } = parseDateOnly(dateStr);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * due_date format emitted to clients: "YYYY-MM-DDT00:00:00" (no zone designator).
 * JS parses this as LOCAL midnight, so the existing UI (`new Date(due_date)` + date-fns
 * `isSameDay` against local calendar days) shows the correct day in every timezone,
 * whereas a bare "YYYY-MM-DD" is parsed as UTC midnight and shifts a day in negative-offset zones.
 */
function toClientDueDate(dateStr: string): string {
  return `${dateStr}T00:00:00`;
}

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
      .select("*, requests(*, profiles(id, name, email, department, role))")
      .eq("month_year", monthStr);

    if (expErr) throw expErr;

    // 2. Fetch all APPROVED/ACTIVE requests to calculate virtual installments
    const { data: approvedRequests, error: appErr } = await supabase
      .from("requests")
      .select("*, profiles(id, name, email, department, role)")
      .in("status", [RequestStatus.APPROVED, RequestStatus.ACTIVE]);

    if (appErr) throw appErr;

    // 3. Fetch all receipts for this month to check status
    const { data: receipts, error: recErr } = await supabase
      .from("receipts")
      .select("request_id, month_year, receipt_file_url")
      .eq("month_year", monthStr);
    
    if (recErr) throw recErr;

    // 4. Generate virtual events
    const virtualEvents = this.generateVirtualEvents(
      approvedRequests as RequestRecord[], 
      year, 
      month, 
      explicitPayments || [], 
      receipts || []
    );

    // 5. Merge and return
    const merged = this.mergeAndSortPayments(
      explicitPayments as (RequestPayment & { requests: RequestRecord })[], 
      virtualEvents
    );

    // Final Status override: If an explicit payment doesn't have PAID status yet but has a receipt, mark as PAID
    // Also attach all receipt URLs for multi-file display
    const receiptsByRequest = new Map<string, any[]>();
    for (const r of receipts || []) {
      const list = receiptsByRequest.get(r.request_id);
      if (list) list.push(r);
      else receiptsByRequest.set(r.request_id, [r]);
    }

    return merged.map(p => {
      const matchingReceipts = receiptsByRequest.get(p.request_id) || [];
      const hasReceipt = matchingReceipts.length > 0;
      return {
        ...p,
        status: hasReceipt && p.status !== "PAID" ? "PAID" : p.status,
        receipt_file_url: matchingReceipts[0]?.receipt_file_url || p.receipt_file_url || null,
        receipt_file_urls: matchingReceipts.map(r => r.receipt_file_url),
      };
    });
  }

  /**
   * Automatically scans for payments due exactly X days from now and notifies users. (Cron Job Entry Point)
   */
  static async runDailyAutoReminders(daysAhead: number = 14) {
    // Target calendar date in the business timezone, as a date-only string
    const targetDate = addDaysToDateString(todayInBusinessTz(), daysAhead);
    const { y: targetYear, m: targetMonth } = parseDateOnly(targetDate);

    const allPaymentsInTargetMonth = await this.getPaymentsByMonth(targetYear, targetMonth);

    const matchingPayments = allPaymentsInTargetMonth.filter(p => {
      if (!p.due_date) return false;
      if (p.status === "PAID") return false;
      return String(p.due_date).slice(0, 10) === targetDate;
    });

    if (matchingPayments.length === 0) return { success: true, count: 0, targetDate };

    const results = [];
    for (const payment of matchingPayments) {
      try {
        const id = payment.id;
        const res = await this.notifyPayment(id);
        results.push({ id, status: "sent", sentTo: res.sentTo });
      } catch (err: any) {
        results.push({ id: payment.id, status: "error", error: err.message });
      }
    }

    return { 
      success: true, 
      count: matchingPayments.length, 
      targetDate,
      results 
    };
  }

  /**
   * Calculates virtual payment dates for requests that aren't in request_payments table.
   * All comparisons use date-only "YYYY-MM-DD" strings (lexicographic order == chronological).
   */
  private static generateVirtualEvents(
    requests: RequestRecord[], 
    year: number, 
    month: number, 
    explicitPayments: any[],
    receipts: any[]
  ) {
    const events: any[] = [];
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;

    const explicitKeys = new Set(explicitPayments.map(p => `${p.request_id}|${p.month_year}`));
    const receiptsByRequest = new Map<string, any[]>();
    for (const r of receipts) {
      const list = receiptsByRequest.get(r.request_id);
      if (list) list.push(r);
      else receiptsByRequest.set(r.request_id, [r]);
    }

    for (const req of requests) {
      if (!req.start_date) continue;

      // Deduplication: If a record already exists in the database for this request/month, skip virtual generation
      if (explicitKeys.has(`${req.id}|${monthStr}`)) continue;

      let start;
      try {
        start = parseDateOnly(req.start_date);
      } catch {
        continue;
      }
      const startStr = req.start_date.slice(0, 10);
      const endStr = req.end_date ? req.end_date.slice(0, 10) : null;
      const billingType = req.billing_type as BillingType;

      // Due date = start day clamped to this month's length (Jan 31 -> Feb 28/29)
      const dueStr = dueDateForMonth(start.d, year, month);

      // Validate if the due date falls within the request's active period
      if (dueStr < startStr) continue;
      if (endStr && dueStr > endStr) continue;

      let isDueThisMonth = false;

      if (billingType === BillingType.ONE_TIME) {
        // Only in the start month
        isDueThisMonth = start.m === month && start.y === year;
      } else if (billingType === BillingType.MONTHLY || billingType === BillingType.YEARLY_MONTHLY) {
        // Every month within period (bounds enforced above)
        isDueThisMonth = true;
      } else if (billingType === BillingType.YEARLY) {
        // Anniversary month only
        isDueThisMonth = start.m === month && year >= start.y;
      }

      if (isDueThisMonth) {
        // Check if a receipt already exists for this virtual installment
        const matchingReceipts = receiptsByRequest.get(req.id) || [];
        const hasReceipt = matchingReceipts.length > 0;

        events.push({
          id: `virtual:${req.id}:${year}:${month}`,
          request_id: req.id,
          amount_due: req.amount,
          month_year: monthStr,
          status: hasReceipt ? "PAID" : "PENDING",
          due_date: toClientDueDate(dueStr),
          requests: req,
          is_virtual: true,
          receipt_file_url: matchingReceipts[0]?.receipt_file_url || null,
          receipt_file_urls: matchingReceipts.map(r => r.receipt_file_url),
        });
      }
    }
    return events;
  }

  /**
   * Explicit rows may lack due_date: derive it from the request's start day for that month_year.
   * Date-only values are normalised to the same client format as virtual events.
   */
  private static withDueDate(p: any) {
    const raw: string | null | undefined = p.due_date;
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return { ...p, due_date: toClientDueDate(raw) };
    if (raw) return p;

    const startDate = p.requests?.start_date;
    const [y, m] = String(p.month_year || "").split("-").map(Number);
    if (!startDate || !y || !m) return p;
    try {
      const due = dueDateForMonth(parseDateOnly(startDate).d, y, m);
      return { ...p, due_date: toClientDueDate(due) };
    } catch {
      return p;
    }
  }

  private static mergeAndSortPayments(explicit: any[], virtual: any[]) {
    const all = [...(explicit || []).map(p => this.withDueDate(p)), ...virtual];

    // Sort by full due date string (rows without a due date go last)
    return all.sort((a, b) => {
      const da = a.due_date ? String(a.due_date) : "9999-12-31";
      const db = b.due_date ? String(b.due_date) : "9999-12-31";
      return da < db ? -1 : da > db ? 1 : 0;
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
        .select("*, profiles(id, name, email, department, role)")
        .eq("id", reqId)
        .single();

      if (error || !request) throw new Error("Request not found: " + reqId);

      paymentData = {
        requests: request,
        amount_due: (request as any).amount,
        month_year: `${year}-${String(month).padStart(2, "0")}`,
        status: "PENDING",
        is_virtual: true
      };
    } else {
      // Fetch explicit payment with request and profile details
      const { data: p, error } = await supabase
        .from("request_payments")
        .select("*, requests(*, profiles(id, name, email, department, role))")
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
      amount: Number(amount_due),
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
    const projectName = data.projectName?.trim() ? data.projectName : "N/A";
    const userName = data.userName?.trim() ? data.userName : "N/A";
    const amount = Number.isFinite(Number(data.amount)) ? Number(data.amount) : 0;
    const appUrl = buildAppUrl("/dashboard");
    const isOverdue = data.status === "OVERDUE";
    const headerColor = isOverdue ? "#EF4444" : "#2563EB"; // Red for overdue, Blue for pending
    
    return {
      type: "flex",
      altText: `แจ้งเตือนการชำระเงิน: ${projectName}`,
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
              text: projectName,
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
                    { type: "text", text: `${amount.toLocaleString()} บาท`, size: "xs", color: "#666666", align: "end", weight: "bold" }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ผู้รับผิดชอบ", size: "xs", color: "#aaaaaa", flex: 0 },
                    { type: "text", text: userName, size: "xs", color: "#666666", align: "end" }
                  ]
                }
              ]
            }
          ]
        },
        ...(appUrl && {
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                action: {
                  type: "uri",
                  label: "ตรวจสอบในระบบ",
                  uri: appUrl
                },
                style: "primary",
                color: headerColor,
                height: "sm"
              }
            ]
          }
        })
      }
    };
  }

  private static formatMonthYear(my: string) {
    const [y, m] = my.split("-");
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return date.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  }
}
