import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = req.cookies.get(getSessionCookieName())?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const session = parseSessionToken(token);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();

        const { data: request } = await supabase
            .from("requests")
            .select("*, profiles(*), projects(*)")
            .eq("id", params.id)
            .single();

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Only allow the request owner or admin to download
        if (session.role !== "admin" && request.user_id !== session.pid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const channels = Array.isArray(request.promotional_channels)
            ? request.promotional_channels.map((ch: any) =>
                `<tr><td style="padding:6px 12px;border:1px solid #e2e8f0;">${ch.channel || "-"}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;">${ch.mediaAccountEmail || "-"}</td><td style="padding:6px 12px;border:1px solid #e2e8f0;">${ch.accessList || "-"}</td></tr>`
            ).join("")
            : "";

        const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Request ${request.event_id}</title>
<style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 32px; color: #1e293b; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 24px 32px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 22px; } .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
    .section { margin-bottom: 20px; } .section h3 { font-size: 14px; color: #6366f1; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .field { margin-bottom: 8px; } .field .label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; } .field .value { font-size: 14px; font-weight: 500; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-PENDING { background: #fef3c7; color: #92400e; } .status-APPROVED { background: #d1fae5; color: #065f46; } .status-REJECTED { background: #fee2e2; color: #991b1b; } .status-COMPLETED { background: #dbeafe; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; } th { background: #f1f5f9; padding: 8px 12px; text-align: left; border: 1px solid #e2e8f0; font-size: 12px; }
    .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .sig-block { text-align: center; } .sig-line { border-top: 1px solid #94a3b8; margin-top: 60px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .print-btn { position: fixed; bottom: 24px; right: 24px; background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
    .print-btn:hover { background: #4f46e5; }
</style>
</head><body>
    <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
    <div class="header">
        <h1>Corporate Card Request</h1>
        <p>${request.event_id} &bull; Created ${new Date(request.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</p>
    </div>

    <div class="section">
        <h3>Request Information</h3>
        <div class="grid">
            <div class="field"><div class="label">Event ID</div><div class="value">${request.event_id}</div></div>
            <div class="field"><div class="label">Status</div><div class="value"><span class="status status-${request.status}">${request.status}</span></div></div>
            <div class="field"><div class="label">Requester</div><div class="value">${request.profiles?.name || "N/A"}</div></div>
            <div class="field"><div class="label">Email</div><div class="value">${request.email || "N/A"}</div></div>
            <div class="field"><div class="label">Contact</div><div class="value">${request.contact_no || "N/A"}</div></div>
            <div class="field"><div class="label">Department</div><div class="value">${request.profiles?.department || "N/A"}</div></div>
        </div>
    </div>

    <div class="section">
        <h3>Project Details</h3>
        <div class="grid">
            <div class="field"><div class="label">Project</div><div class="value">${request.project_name || "N/A"}</div></div>
            <div class="field"><div class="label">Billing Type</div><div class="value">${(request.billing_type || "").replace("_", " ")}</div></div>
            <div class="field"><div class="label">Amount</div><div class="value" style="font-size:18px;color:#6366f1;">&#3647;${Number(request.amount || 0).toLocaleString()}</div></div>
            <div class="field"><div class="label">Period</div><div class="value">${request.start_date ? new Date(request.start_date).toLocaleDateString("en-GB") : "N/A"} - ${request.end_date ? new Date(request.end_date).toLocaleDateString("en-GB") : "N/A"}</div></div>
        </div>
    </div>

    <div class="section">
        <h3>Objective</h3>
        <p style="font-size:14px;line-height:1.6;">${request.objective || "N/A"}</p>
    </div>

    ${channels ? `<div class="section"><h3>Promotional Channels</h3><table><thead><tr><th>Channel</th><th>Media Account</th><th>Access List</th></tr></thead><tbody>${channels}</tbody></table></div>` : ""}

    ${request.approval_notes ? `<div class="section"><h3>Approval Notes</h3><p style="font-size:14px;">${request.approval_notes}</p></div>` : ""}

    <div class="signature-area">
        <div class="sig-block"><div class="sig-line">Requester Signature</div></div>
        <div class="sig-block"><div class="sig-line">Approver Signature</div></div>
    </div>
</body></html>`;

        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
