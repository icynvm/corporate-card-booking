import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key_for_build");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Find or create the request record
    let request;

    // Check if request already exists (by looking for matching data)
    const existingRequests = await prisma.request.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: { user: true, project: true },
    });

    if (existingRequests.length > 0) {
      request = existingRequests[0];
    } else {
      // Create a new request
      const year = new Date().getFullYear();
      const count = await prisma.request.count({
        where: { eventId: { startsWith: `REQ-${year}` } },
      });
      const eventId = `REQ-${year}-${String(count + 1).padStart(4, "0")}`;

      let user = await prisma.user.findFirst({
        where: { email: "employee@company.com" },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: body.fullName,
            email: "employee@company.com",
            department: body.department,
            role: "USER",
          },
        });
      }

      request = await prisma.request.create({
        data: {
          eventId,
          userId: user.id,
          projectId: body.projectId,
          amount: parseFloat(body.amount),
          objective: body.objective,
          contactNo: body.contactNo,
          billingType: body.billingType,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          promotionalChannels: body.promotionalChannels || [],
          status: "PENDING",
        },
        include: { user: true, project: true },
      });
    }

    // Generate approval token
    const approvalToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.request.update({
      where: { id: request.id },
      data: {
        approvalToken,
        approvalTokenExpiry: tokenExpiry,
      },
    });

    const approveUrl = `${appUrl}/api/approve?token=${approvalToken}&action=approve`;
    const rejectUrl = `${appUrl}/api/approve?token=${approvalToken}&action=reject`;

    const billingLabel = body.billingType
      ?.replace("ONE_TIME", "One-time")
      .replace("MONTHLY", "Monthly")
      .replace("YEARLY", "Yearly");

    // Find manager to send to
    const manager = await prisma.user.findFirst({
      where: { role: "MANAGER" },
    });

    const managerEmail = manager?.email || "manager@company.com";

    // Send approval email via Resend
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "re_xxxxxxxxxxxx") {
      await resend.emails.send({
        from: "Card Booking System <onboarding@resend.dev>",
        to: managerEmail,
        subject: `[Action Required] Card Request: ${request.eventId}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 32px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 32px; border-radius: 16px 16px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 20px;">Corporate Card Request</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Approval Required</p>
            </div>
            <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; width: 140px;">Event ID</td>
                  <td style="padding: 10px 0; font-weight: 600; color: #1e293b;">${request.eventId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8;">Requester</td>
                  <td style="padding: 10px 0; color: #1e293b;">${body.fullName} (${body.department})</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8;">Amount</td>
                  <td style="padding: 10px 0; font-weight: 600; color: #1e293b;">฿${parseFloat(body.amount).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8;">Billing Type</td>
                  <td style="padding: 10px 0; color: #1e293b;">${billingLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8;">Objective</td>
                  <td style="padding: 10px 0; color: #1e293b;">${body.objective}</td>
                </tr>
              </table>
              
              <div style="margin-top: 32px; text-align: center;">
                <a href="${approveUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #10b981, #14b8a6); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; margin-right: 12px;">
                  ✓ Approve
                </a>
                <a href="${rejectUrl}" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #ef4444, #f43f5e); color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px;">
                  ✕ Reject
                </a>
              </div>
              
              <p style="margin-top: 24px; font-size: 11px; color: #94a3b8; text-align: center;">
                This link expires in 7 days. Click to approve or reject directly.
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      eventId: request.eventId,
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
