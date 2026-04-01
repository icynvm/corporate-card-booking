import { createServerSupabase } from "@/lib/supabase";
import { RequestStatus, BillingType, AuditAction, EntityType } from "@/types/enums";
import { normalizeThaiText } from "@/lib/utils/string";
import { sendLineNotification } from "@/lib/line";
import { RequestRecord, AuditLog } from "@/lib/types";

export class RequestService {
  /**
   * Fetches all requests with filters and joined data.
   */
  static async getRequests(filters: { status?: RequestStatus; billingType?: BillingType; userId?: string } = {}) {
    const supabase = createServerSupabase();
    
    let query = supabase
      .from("requests")
      .select("*, profiles(*), projects(*), receipts(*), request_payments(*)")
      .order("created_at", { ascending: false });

    if (filters.userId) query = query.eq("user_id", filters.userId);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.billingType) query = query.eq("billing_type", filters.billingType);

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []) as RequestRecord[];
  }

  /**
   * Creates a new request and handles associated side effects.
   */
  static async createRequest(userId: string, body: any) {
    const supabase = createServerSupabase();

    // 1. Data Sanitization
    const sanitizedBody = {
      ...body,
      projectName: normalizeThaiText(body.projectName),
      objective: normalizeThaiText(body.objective),
      contactNo: normalizeThaiText(body.contactNo),
      fullName: normalizeThaiText(body.fullName),
    };

    // 2. Generate Request ID if not provided
    let reqId = sanitizedBody.reqId;
    if (!reqId) {
      const year = new Date().getFullYear();
      const { data: existingIds } = await supabase
        .from("requests")
        .select("req_id")
        .like("req_id", `REQ-${year}%`);

      let nextNumber = 1;
      if (existingIds && existingIds.length > 0) {
        const numbers = existingIds.map((r: { req_id: string }) => {
          const parts = r.req_id.split("-");
          return parseInt(parts[parts.length - 1]) || 0;
        });
        nextNumber = Math.max(...numbers) + 1;
      }
      reqId = `REQ-${year}-${String(nextNumber).padStart(4, "0")}`;
    }

    // 3. Project Linking/Creation
    let projectId = sanitizedBody.projectId;
    if (!projectId && sanitizedBody.projectName) {
      const { data: existingProject } = await supabase
        .from("projects")
        .select("id")
        .ilike("project_name", sanitizedBody.projectName)
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

    // 4. Insert Request
    const { data: request, error: insertError } = await supabase
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
        status: RequestStatus.PENDING_APPROVAL,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 5. Handle Side Effects Async-ishly
    this.createPayments(request.id, sanitizedBody).catch(console.error);
    this.generateAndBackupPdf(request, sanitizedBody).catch(console.error);
    this.logAudit(userId, request.id, request.req_id, sanitizedBody).catch(console.error);
    this.notifyLine(sanitizedBody).catch(console.error);

    return request as RequestRecord;
  }

  private static async createPayments(requestId: string, body: any) {
    if (body.billingType !== BillingType.YEARLY_MONTHLY) return;
    
    const supabase = createServerSupabase();
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const totalAmount = parseFloat(body.amount);
    const months: string[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    const monthlyAmount = totalAmount / (months.length || 1);
    const payments = months.map((my) => ({
      request_id: requestId,
      month_year: my,
      amount_due: Math.round(monthlyAmount * 100) / 100,
      amount_paid: 0,
      status: "PENDING",
    }));

    await supabase.from("request_payments").insert(payments);
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
      console.log("[RequestService] Creating notification for:", body.projectName);
      const flexMessage = this.createRequestFlexMessage(body);
      
      const result = await sendLineNotification(flexMessage);
      if (!result.success) {
        console.error("[RequestService] LINE Notification failed:", result.error);
      } else {
        console.log("[RequestService] LINE Notification sent successfully");
      }
    } catch (err) {
      console.error("[RequestService] Failed to generate/send notification:", err);
    }
  }

  private static createRequestFlexMessage(body: any) {
    const headerColor = "#10B981"; // Emerald Green for New Request
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount || "0");
    
    return {
      type: "flex",
      altText: `คําขอใหม่: ${body.projectName || "N/A"}`,
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
              text: body.projectName || "N/A",
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
                    { type: "text", text: body.fullName || "N/A", size: "xs", color: "#666666", align: "end", flex: 4 }
                  ]
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    { type: "text", text: "ทีม/แผนก", size: "xs", color: "#aaaaaa", flex: 1 },
                    { type: "text", text: body.department || "N/A", size: "xs", color: "#666666", align: "end", flex: 4 }
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
                  text: body.objective || "N/A",
                  size: "xs",
                  color: "#4b5563",
                  wrap: true
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
                label: "ตรวจสอบคําขอ",
                uri: "https://line.me" // Placeholder
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
}
