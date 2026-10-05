import { createServerSupabase } from "@/lib/supabase";
import { RequestStatus, BillingType, AuditAction, EntityType } from "@/types/enums";
import { normalizeThaiText } from "@/lib/utils/string";
import { sendLineNotification, buildAppUrl } from "@/lib/line";
import { monthsInRange, splitAmount } from "@/lib/billing/schedule";
import { RequestRecord, AuditLog } from "@/lib/types";

export class RequestService {
  /**
   * Fetches all requests with filters and joined data.
   */
  static async getRequests(filters: { status?: RequestStatus; billingType?: BillingType; userId?: string } = {}) {
    const supabase = createServerSupabase();
    
    let query = supabase
      .from("requests")
      .select("*, profiles(id, name, email, department, role), projects(*), receipts(*), request_payments(*)")
      .order("created_at", { ascending: false });

    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.billingType) query = query.eq("billing_type", filters.billingType);

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []) as RequestRecord[];
  }

  /**
   * Generates the next REQ-YYYY-NNNN id. Uses the atomic `next_req_id` RPC and falls back
   * to max+1 (racy) when the migration has not been applied yet.
   */
  private static async generateReqId(supabase: ReturnType<typeof createServerSupabase>) {
    const year = new Date().getFullYear();
    const { data: rpcId, error: rpcError } = await supabase.rpc("next_req_id", { p_year: year });
    if (!rpcError && typeof rpcId === "string" && rpcId) return rpcId;

    const { data: existingIds } = await supabase
      .from("requests")
      .select("req_id")
      .like("req_id", `REQ-${year}-%`);

    let nextNumber = 1;
    if (existingIds && existingIds.length > 0) {
      const numbers = existingIds.map((r: { req_id: string }) => {
        const parts = r.req_id.split("-");
        return parseInt(parts[parts.length - 1]) || 0;
      });
      nextNumber = Math.max(...numbers) + 1;
    }
    return `REQ-${year}-${String(nextNumber).padStart(4, "0")}`;
  }

  /**
   * Creates a new request and handles associated side effects.
   * `body.reqId` is ignored unless `opts.allowCustomReqId` is true (e.g. trusted admin import).
   */
  static async createRequest(userId: string, body: any, opts: { allowCustomReqId?: boolean } = {}) {
    const supabase = createServerSupabase();

    // 1. Data Sanitization
    const sanitizedBody = {
      ...body,
      projectName: normalizeThaiText(body.projectName),
      objective: normalizeThaiText(body.objective),
      contactNo: normalizeThaiText(body.contactNo),
      fullName: normalizeThaiText(body.fullName),
    };

    // 2. Request ID (client-provided only when explicitly allowed)
    const customReqId: string | undefined =
      opts.allowCustomReqId && sanitizedBody.reqId ? String(sanitizedBody.reqId) : undefined;
    let reqId = customReqId || (await this.generateReqId(supabase));

    // 3. Project Linking/Creation
    let projectId = sanitizedBody.projectId;
    if (!projectId && sanitizedBody.projectName) {
      // Escape LIKE wildcards so the name is matched literally (case-insensitively)
      const escapedName = String(sanitizedBody.projectName).replace(/[\\%_]/g, "\\$&");
      const { data: existingProject } = await supabase
        .from("projects")
        .select("id")
        .ilike("project_name", escapedName)
        .limit(1)
        .maybeSingle();

      if (existingProject) {
        projectId = existingProject.id;
      } else {
        const { data: newProject } = await supabase
          .from("projects")
          .insert({
            project_name: sanitizedBody.projectName,
            created_by: userId,
            total_budget: 0,
            remaining_budget: 0
          })
          .select()
          .single();
        if (newProject) projectId = newProject.id;
      }
    }

    // 4. Insert Request (retry with a fresh id on req_id unique violation when auto-generated)
    const MAX_ATTEMPTS = 3;
    let request: any = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { data, error: insertError } = await supabase
        .from("requests")
        .insert({
          req_id: reqId,
          event_id: sanitizedBody.eventDetails?.[0]?.eventId || null,
          user_id: userId,
          full_name: sanitizedBody.fullName || "",
          project_id: projectId || null,
          project_name: sanitizedBody.projectName,
          amount: parseFloat(sanitizedBody.amount),
          objective: sanitizedBody.objective,
          contact_no: sanitizedBody.contactNo,
          email: sanitizedBody.email || "dev@company.com",
          department: sanitizedBody.department || "",
          billing_type: sanitizedBody.billingType,
          start_date: sanitizedBody.startDate,
          end_date: sanitizedBody.endDate,
          booking_date: sanitizedBody.bookingDate || null,
          effective_date: sanitizedBody.effectiveDate || null,
          promotional_channels: sanitizedBody.promotionalChannels || [],
          account_code: sanitizedBody.eventDetails?.[0]?.accountCode || null,
          event_details: sanitizedBody.eventDetails || [],
          credit_card_no: sanitizedBody.creditCardNo || null,
          fb_campaign_id: sanitizedBody.fbCampaignId || null,
          fb_ad_account_id: sanitizedBody.fbAdAccountId || null,
          status: RequestStatus.PENDING_APPROVAL,
        })
        .select()
        .single();

      if (!insertError) {
        request = data;
        break;
      }

      const isReqIdConflict =
        insertError.code === "23505" && /req_id/i.test(`${insertError.message} ${insertError.details ?? ""}`);
      if (!customReqId && isReqIdConflict && attempt < MAX_ATTEMPTS) {
        reqId = await this.generateReqId(supabase);
        continue;
      }
      throw insertError;
    }

    // 5. Side effects: awaited so serverless runtimes don't kill them; failures are logged, not fatal
    const tasks: Array<[string, Promise<unknown>]> = [
      ["createPayments", this.createPayments(request.id, sanitizedBody)],
      ["generateAndBackupPdf", this.generateAndBackupPdf(request, sanitizedBody)],
      ["logAudit", this.logAudit(userId, request.id, request.req_id, sanitizedBody)],
      ["notifyLine", this.notifyLine(sanitizedBody)],
    ];
    const results = await Promise.allSettled(tasks.map(([, t]) => t));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[RequestService] ${tasks[i][0]} failed for ${request.req_id}:`, r.reason);
      }
    });

    return request as RequestRecord;
  }

  private static async createPayments(requestId: string, body: any) {
    // Calendar-month iteration on integers (no day overflow, no timezone shifts)
    const months = monthsInRange(body.startDate, body.endDate);

    const isMonthlyLongTerm = body.billingType === BillingType.MONTHLY && months.length > 2;
    const isYearlyMonthly = body.billingType === BillingType.YEARLY_MONTHLY;

    // Only create installment payments for YEARLY_MONTHLY or long-term MONTHLY
    if (!isYearlyMonthly && !isMonthlyLongTerm) return;
    if (months.length === 0) return;

    const supabase = createServerSupabase();
    const amounts = splitAmount(parseFloat(body.amount), months.length);

    const payments = months.map((my, i) => ({
      request_id: requestId,
      month_year: my,
      amount_due: amounts[i],
      amount_paid: 0,
      status: "PENDING",
    }));

    const { error } = await supabase.from("request_payments").insert(payments);
    if (error) throw error;
  }

  private static async generateAndBackupPdf(request: any, body: any) {
    const { generateRequestPdf } = await import("@/lib/pdf-generator");
    const pdfBytes = await generateRequestPdf({
      ...body,
      reqId: request.req_id
    });

    const supabase = createServerSupabase();
    const fileName = `${new Date().toISOString().split("T")[0]}_${request.id}.pdf`;

    await supabase.storage
      .from("Request Form")
      .upload(fileName, Buffer.from(pdfBytes), {
        contentType: "application/pdf",
        upsert: true
      });
  }

  private static async logAudit(userId: string, id: string, reqId: string, body: any) {
    const supabase = createServerSupabase();
    await supabase.from("audit_logs").insert({
      entity_type: EntityType.REQUEST,
      entity_id: id,
      action: AuditAction.CREATE,
      user_id: userId,
      user_name: body.fullName || "System Admin",
      changes: { 
        req_id: reqId, 
        amount: body.amount, 
        project_name: body.projectName, 
        billing_type: body.billingType 
      },
    });
  }

  private static async notifyLine(body: any) {
    try {
      const flexMessage = this.createRequestFlexMessage(body);
      
      const result = await sendLineNotification(flexMessage);
      if (!result.success) {
        console.error("[RequestService] LINE Notification failed:", result.error);
      }
    } catch (err) {
      console.error("[RequestService] Failed to generate/send notification:", err);
    }
  }

  private static createRequestFlexMessage(body: any) {
    const headerColor = "#10B981"; // Emerald Green for New Request
    const parsedAmount = Number(body.amount);
    const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
    const nonEmpty = (v: unknown) => (typeof v === "string" && v.trim() ? v : "N/A");
    const appUrl = buildAppUrl("/admin");
    
    return {
      type: "flex",
      altText: `คําขอใหม่: ${nonEmpty(body.projectName)}`,
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "📣 ใหม่! คําขอการใช้บัตรเครดิต",
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
              text: nonEmpty(body.projectName),
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
                    { type: "text", text: "ผู้ขอ", size: "xs", color: "#aaaaaa", flex: 1 },
                    { type: "text", text: nonEmpty(body.fullName), size: "xs", color: "#666666", align: "end", flex: 4 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ทีม/แผนก", size: "xs", color: "#aaaaaa", flex: 1 },
                    { type: "text", text: nonEmpty(body.department), size: "xs", color: "#666666", align: "end", flex: 4 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "วงเงิน", size: "xs", color: "#aaaaaa", flex: 1 },
                    { type: "text", text: `${amount.toLocaleString()} บาท`, size: "xs", color: "#666666", align: "end", weight: "bold", flex: 4 }
                  ]
                }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              paddingAll: "sm",
              backgroundColor: "#F3F4F6",
              cornerRadius: "sm",
              contents: [
                {
                  type: "text",
                  text: "เหตุผล/วัตถุประสงค์:",
                  size: "xxs",
                  color: "#9ca3af",
                  margin: "none"
                },
                {
                  type: "text",
                  text: nonEmpty(body.objective),
                  size: "xs",
                  color: "#4b5563",
                  wrap: true
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
                  label: "ตรวจสอบคําขอ",
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
}
