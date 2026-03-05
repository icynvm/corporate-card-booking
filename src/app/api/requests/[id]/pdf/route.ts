import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";
import { IMPACT_LOGO_BASE64 } from "@/lib/logo-base64";

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

        if (session.role !== "admin" && request.user_id !== session.pid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const allChannels = ["Facebook", "Youtube", "Google", "IG", "Line", "Tiktok", "WeChat"];
        const activeChannels = Array.isArray(request.promotional_channels)
            ? request.promotional_channels.map((ch: any) => ch.channel)
            : [];

        const channelCheckboxes = allChannels.map(ch => {
            const checked = activeChannels.includes(ch);
            const detail = Array.isArray(request.promotional_channels)
                ? request.promotional_channels.find((c: any) => c.channel === ch)
                : null;
            return `<div style="display:inline-flex;align-items:center;gap:6px;min-width:140px;margin-bottom:4px;">
                <div style="width:14px;height:14px;border:1.5px solid #94a3b8;display:flex;align-items:center;justify-content:center;font-size:10px;">
                    ${checked ? "&#10003;" : "&nbsp;"}
                </div>
                <span style="font-size:12px;">${ch}</span>
            </div>`;
        }).join("");

        const hasOther = activeChannels.some((ch: string) => !allChannels.includes(ch));
        const otherVal = hasOther ? activeChannels.find((ch: string) => !allChannels.includes(ch)) : "";

        const fmtDate = (d: string | null) => {
            if (!d) return "____________________";
            return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        };

        const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Request ${request.event_id}</title>
<style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } @page { margin: 15mm; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 720px; margin: 0 auto; padding: 30px 24px; color: #1e293b; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .header h1 { font-size: 16px; font-weight: 700; text-align: center; flex: 1; }
    .logo-area { width: 140px; text-align: right; }
    .section-title { font-size: 13px; font-weight: 700; color: #7c5c30; margin: 16px 0 8px 0; border-bottom: none; }
    .form-row { display: flex; gap: 12px; margin-bottom: 6px; align-items: baseline; }
    .form-label { font-size: 12px; font-weight: 600; color: #475569; white-space: nowrap; min-width: 140px; }
    .form-value { flex: 1; border-bottom: 1px dotted #94a3b8; padding-bottom: 2px; font-size: 13px; min-height: 18px; }
    .card-no { text-align: center; margin-bottom: 14px; }
    .card-no span { font-size: 14px; font-weight: 700; }
    .card-no .val { display: inline-block; border-bottom: 2px solid #1e293b; min-width: 200px; padding: 2px 8px; font-family: monospace; font-size: 15px; }
    .channels-grid { display: flex; flex-wrap: wrap; gap: 4px 16px; margin: 8px 0; }
    .dates-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .sig-section { margin-top: 28px; }
    .sig-row { display: flex; gap: 24px; margin-bottom: 24px; }
    .sig-block { flex: 1; }
    .sig-block .sig-title { font-size: 13px; font-weight: 700; color: #7c5c30; margin-bottom: 4px; }
    .sig-line { display: flex; align-items: baseline; gap: 8px; margin-top: 36px; }
    .sig-line .label { font-size: 12px; white-space: nowrap; }
    .sig-line .line { flex: 1; border-bottom: 1px dotted #64748b; }
    .fa-section { margin-top: 20px; padding-top: 12px; border-top: 2px solid #1e293b; }
    .fa-section .sig-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
    .print-btn { position: fixed; bottom: 20px; right: 20px; background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; cursor: pointer; box-shadow: 0 4px 16px rgba(99,102,241,0.4); z-index: 100; }
    .print-btn:hover { background: #4f46e5; }
    .small-note { font-size: 10px; color: #94a3b8; font-style: italic; }
</style>
</head><body>

<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

<!-- Header -->
<div class="header">
    <div style="width:100px;"></div>
    <div style="flex:1;text-align:center;">
        <p style="font-size:14px;font-weight:700;margin-bottom:2px;">CORPORATE EXECUTIVE CARD REQUEST FORM</p>
    </div>
    <div class="logo-area"><img src="${IMPACT_LOGO_BASE64}" alt="IMPACT" style="max-height: 40px; width: auto;" /></div>
</div>

<!-- Card No -->
<div class="card-no">
    <span>CARD NO.</span> <span class="val">&nbsp;</span>
</div>

<!-- Requester Staff Section -->
<div class="section-title">REQUESTER STAFF</div>
<div class="form-row">
    <span class="form-label">Full Name :</span>
    <span class="form-value">${request.profiles?.name || ""}</span>
</div>
<div class="form-row">
    <span class="form-label">Department :</span>
    <span class="form-value">${request.profiles?.department || ""}</span>
</div>
<div class="form-row">
    <span class="form-label">Contact No. :</span>
    <span class="form-value" style="max-width:200px;">${request.contact_no || ""}</span>
    <span class="form-label" style="min-width:60px;">E-Mail :</span>
    <span class="form-value">${request.email || ""}</span>
</div>

<!-- Request Details -->
<div class="section-title">REQUEST DETAILS</div>
<div class="form-row">
    <span class="form-label">Objective :</span>
    <span class="form-value">${request.objective || ""}</span>
</div>
<div style="margin-top:2px;margin-bottom:4px;">
    <span class="form-value" style="display:block;border-bottom:1px dotted #94a3b8;min-height:18px;">${request.project_name || ""}</span>
</div>

<!-- Promotional Channels -->
<div style="margin-top:12px;">
    <span style="font-size:12px;font-weight:600;">Promotional Channels</span>
    <p class="small-note">*Choose your type of Promotional Channels</p>
    <div class="channels-grid" style="margin-top:6px;">
        ${channelCheckboxes}
        <div style="display:inline-flex;align-items:center;gap:6px;min-width:200px;">
            <div style="width:14px;height:14px;border:1.5px solid #94a3b8;display:flex;align-items:center;justify-content:center;font-size:10px;">
                ${hasOther ? "&#10003;" : "&nbsp;"}
            </div>
            <span style="font-size:12px;">Other : </span>
            <span style="flex:1;border-bottom:1px dotted #94a3b8;font-size:12px;">${otherVal || ""}</span>
        </div>
    </div>
</div>

<!-- Dates -->
<div style="margin-top:12px;">
    <div class="form-row">
        <span class="form-label">Booking Date :</span>
        <span class="form-value">${fmtDate(request.booking_date)}</span>
    </div>
    <div class="form-row">
        <span class="form-label">Effective Date :</span>
        <span class="form-value">${fmtDate(request.effective_date)}</span>
    </div>
    <div class="dates-grid">
        <div class="form-row">
            <span class="form-label">Start Date :</span>
            <span class="form-value">${fmtDate(request.start_date)}</span>
        </div>
        <div class="form-row">
            <span class="form-label">End Date :</span>
            <span class="form-value">${fmtDate(request.end_date)}</span>
        </div>
    </div>
    <div class="form-row">
        <span class="form-label">Amount :</span>
        <span class="form-value" style="font-weight:600;">THB ${Number(request.amount || 0).toLocaleString()} (${(request.billing_type || "").replace("_", " ")})</span>
    </div>
</div>

<!-- Signature Sections -->
<div class="sig-section">
    <div class="sig-row">
        <div class="sig-block">
            <div class="sig-title">REQUESTER SIGNATURE</div>
            <div class="sig-line"><span class="label">Signature :</span><span class="line"></span></div>
            <div class="sig-line" style="margin-top:12px;"><span class="label">Date :</span><span class="line"></span></div>
        </div>
    </div>
    <div class="sig-row">
        <div class="sig-block">
            <div class="sig-title" style="color:#7c5c30;">AUTHORIZER</div>
            <div class="sig-line"><span class="label">Signature :</span><span class="line"></span><span class="label" style="margin-left:20px;">Date :</span><span class="line"></span></div>
        </div>
    </div>
    <div class="fa-section">
        <div class="sig-title">FA DEPARTMENT USE ONLY</div>
        <div class="sig-line"><span class="label">Verified By :</span><span class="line"></span><span class="label" style="margin-left:20px;">Date :</span><span class="line"></span></div>
    </div>
</div>

</body></html>`;

        return new NextResponse(html, {
            headers: { "Content-Type": "text/html; charset=utf-8" },
        });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
