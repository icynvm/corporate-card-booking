import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const body = await req.json();
    
    // If we have an id, update it; otherwise find latest pending
    let id = body.id || body.requestId;
    let requestData: any = { ...body };

    if (!id) {
      const { data: latestReq } = await supabase
        .from("requests")
        .select("*, projects(project_name), profiles(name, department)")
        .eq("status", "PENDING_APPROVAL")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      id = latestReq?.id;
      if (latestReq) {
        requestData = {
          ...latestReq,
          projectName: latestReq.projects?.project_name || "N/A",
          fullName: latestReq.profiles?.name || "Unknown User",
          department: latestReq.profiles?.department || "N/A",
          amount: latestReq.amount,
          billingType: latestReq.billing_type,
          objective: latestReq.objective,
          reqId: latestReq.req_id
        };
      }
    } else {
      // Fetch full details with join to profiles for requester name
      const { data: dbReq } = await supabase
        .from("requests")
        .select("*, projects(project_name), profiles(name, department)")
        .eq("id", id)
        .single();
      
      if (dbReq) {
        requestData = {
          ...dbReq,
          projectName: dbReq.projects?.project_name || "N/A",
          fullName: dbReq.profiles?.name || "Unknown User",
          department: dbReq.profiles?.department || "N/A",
          amount: dbReq.amount,
          billingType: dbReq.billing_type,
          objective: dbReq.objective,
          reqId: dbReq.req_id
        };
      }
    }

    const billingLabel = (requestData.billingType || "")
      .replace("ONE_TIME", "One-time")
      .replace("MONTHLY", "Monthly")
      .replace("YEARLY_MONTHLY", "Yearly (Monthly payments)")
      .replace("YEARLY", "Yearly");

    // Fetch dynamic manager, sender, and API key from app_settings
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['MANAGER_EMAIL', 'SENDER_EMAIL', 'RESEND_API_KEY']);
    
    const settings = (settingsData || []).reduce((acc: Record<string, string>, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    const managerEmail = requestData.managerEmail || settings.MANAGER_EMAIL || "manager@company.com";
    const senderEmail = settings.SENDER_EMAIL || "support@booking.kie-ra.online";
    
    // Initialize Resend with dynamic key if available
    const activeResendKey = settings.RESEND_API_KEY || process.env.RESEND_API_KEY;
    const activeResend = activeResendKey ? new Resend(activeResendKey) : resend;

    // Send approval notification email via Resend
    if (activeResendKey && activeResendKey !== "re_xxxxxxxxxxxx" && activeResendKey !== "re_dummy_key_for_build") {
      const resendResponse = await activeResend.emails.send({
        from: senderEmail,
        to: managerEmail,
        subject: `[Notification] New Card Request: ${requestData.reqId || "Request"}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Corporate Card Request Notification</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Arial, sans-serif;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc;">
                <tr>
                  <td align="center" style="padding: 32px 16px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                      <!-- Header -->
                      <tr>
                        <td style="background-color: #6366f1; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">Card Request Notification</h1>
                          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">A new request has been submitted and is pending review</p>
                        </td>
                      </tr>
                      <!-- Content -->
                      <tr>
                        <td style="padding: 40px 32px;">
                          <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding-bottom: 32px;">
                                <h2 style="color: #1e293b; margin: 0 0 16px; font-size: 18px; font-weight: 600;">Request Details</h2>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; padding: 20px;">
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Requester</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${requestData.fullName}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Team</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${requestData.department}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Project</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${requestData.projectName}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Amount</td>
                                    <td style="padding: 8px 0; color: #6366f1; font-size: 16px; font-weight: 700;">THB ${parseFloat(requestData.amount?.toString() || "0").toLocaleString()}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Billing</td>
                                    <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${billingLabel}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td>
                                <h2 style="color: #1e293b; margin: 0 0 12px; font-size: 16px; font-weight: 600;">Objective</h2>
                                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                                  ${requestData.objective || "No objective provided."}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding-top: 40px; border-top: 1px solid #f1f5f9; margin-top: 40px;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                                  Please log in to the Corporate Card Booking system to review and take action on this request.
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>`,
      });

      if (resendResponse.error) {
        console.error("Resend API Error details:", {
          error: resendResponse.error,
          to: managerEmail,
          from: senderEmail,
          apiKeyUsed: activeResendKey ? `${activeResendKey.slice(0, 7)}...` : "none"
        });
        throw new Error(resendResponse.error.message ? `Resend API Error: ${resendResponse.error.message}` : "Failed to send email via Resend");
      }
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      entity_type: "REQUEST",
      entity_id: id || "",
      action: "SEND_APPROVAL_NOTIFICATION",
      user_name: requestData.fullName || "",
      changes: { sent_to: managerEmail },
    });

    return NextResponse.json({
      success: true,
      message: `Approval notification sent to manager (${managerEmail})`,
      sentTo: managerEmail,
    });
  } catch (error) {
    console.error("Failed to send approval:", error);
    return NextResponse.json(
      { error: "Failed to send approval request" },
      { status: 500 }
    );
  }
}
