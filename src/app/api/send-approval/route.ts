import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const body = await req.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Generate approval token
    const approvalToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // If we have an id, update it; otherwise find latest pending
    let id = body.id || body.requestId;
    if (!id) {
      const { data: latestReq } = await supabase
        .from("requests")
        .select("id")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      id = latestReq?.id;
    }

    if (id) {
      await supabase
        .from("requests")
        .update({
          approval_token: approvalToken,
          approval_token_expiry: tokenExpiry.toISOString(),
        })
        .eq("id", id);
    }

    const approveUrl = `${appUrl}/api/approve?token=${approvalToken}&action=approve`;
    const rejectUrl = `${appUrl}/api/approve?token=${approvalToken}&action=reject`;

    const billingLabel = (body.billingType || "")
      .replace("ONE_TIME", "One-time")
      .replace("MONTHLY", "Monthly")
      .replace("YEARLY_MONTHLY", "Yearly (Monthly payments)")
      .replace("YEARLY", "Yearly");

    // Send approval email via Resend
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_xxxxxxxxxxxx" && process.env.RESEND_API_KEY !== "re_dummy_key_for_build") {
      const managerEmail = body.managerEmail || "manager@company.com";

      await resend.emails.send({
        from: "Card Booking System <onboarding@resend.dev>",
        to: managerEmail,
        subject: `[Action Required] Card Request: ${body.eventId || "New Request"}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 32px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Corporate Card Request</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Approval Required</p>
            </div>
            <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr><td style="padding: 10px 0; color: #94a3b8; width: 140px;">Requester</td><td style="padding: 10px 0; color: #1e293b;">${body.fullName} (${body.department})</td></tr>
                <tr><td style="padding: 10px 0; color: #94a3b8;">Project</td><td style="padding: 10px 0; color: #1e293b;">${body.projectName || "N/A"}</td></tr>
                <tr><td style="padding: 10px 0; color: #94a3b8;">Amount</td><td style="padding: 10px 0; font-weight: 600; color: #1e293b;">THB ${parseFloat(body.amount).toLocaleString()}</td></tr>
                <tr><td style="padding: 10px 0; color: #94a3b8;">Billing Type</td><td style="padding: 10px 0; color: #1e293b;">${billingLabel}</td></tr>
                <tr><td style="padding: 10px 0; color: #94a3b8;">Objective</td><td style="padding: 10px 0; color: #1e293b;">${body.objective}</td></tr>
              </table>
              <div style="margin-top: 32px; text-align: center;">
                <a href="${approveUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #10b981, #14b8a6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; margin-right: 12px;">โ“ Approve</a>
                <a href="${rejectUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #ef4444, #f43f5e); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">โ• Reject</a>
              </div>
              <p style="margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center;">This link expires in 7 days.</p>
            </div>
          </div>`,
      });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      entity_type: "REQUEST",
      entity_id: id || "",
      action: "SEND_APPROVAL",
      user_id: body.userId || null,
      user_name: body.fullName || "",
      changes: { sent_to: body.managerEmail || "manager@company.com" },
    });

    return NextResponse.json({
      success: true,
      message: "Approval request sent to manager",
    });
  } catch (error) {
    console.error("Failed to send approval:", error);
    return NextResponse.json(
      { error: "Failed to send approval request" },
      { status: 500 }
    );
  }
}
