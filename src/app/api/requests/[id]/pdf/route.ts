import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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

        // Map database data to form data structure for the PDF generator
        const formData = {
            eventId: request.event_id,
            fullName: request.profiles?.name || "",
            department: request.profiles?.department || "",
            contactNo: request.contact_no || "",
            email: request.email || "",
            objective: request.objective || "",
            projectName: request.project_name || "",
            promotionalChannels: request.promotional_channels || [],
            bookingDate: request.booking_date,
            effectiveDate: request.effective_date,
            startDate: request.start_date,
            endDate: request.end_date,
            amount: request.amount,
        };

        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        // PDF GENERATION LOGIC (Mirrors api/generate-pdf)
        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4

        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const { width, height } = page.getSize();
        const textColor = rgb(0.15, 0.15, 0.15);
        const labelColor = rgb(0.35, 0.35, 0.35);
        const brownColor = rgb(0.55, 0.32, 0.15);
        const lineColor = rgb(0.7, 0.7, 0.7);
        const lightGray = rgb(0.85, 0.85, 0.85);

        let y = height - 50;

        // Helper: format date
        const fmtDate = (d: string | null | undefined) => {
            if (!d) return "";
            try {
                return new Date(d).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                });
            } catch {
                return d || "";
            }
        };

        // Header Logo
        const logoBytes = Buffer.from(IMPACT_LOGO_BASE64.split(",")[1], "base64");
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.10); // Matches the new smaller size
        page.drawImage(logoImage, {
            x: width - logoDims.width - 25,
            y: height - logoDims.height - 20,
            width: logoDims.width,
            height: logoDims.height,
        });

        // Title
        const title = "CORPORATE EXECUTIVE CARD REQUEST FORM";
        const titleWidth = helveticaBold.widthOfTextAtSize(title, 14);
        page.drawText(title, {
            x: (width - titleWidth) / 2, y: height - 50, size: 14, font: helveticaBold, color: textColor,
        });
        y = height - 80;

        // CARD NO.
        page.drawText("CARD NO.", { x: 200, y, size: 10, font: helveticaBold, color: textColor });
        page.drawLine({ start: { x: 270, y: y - 4 }, end: { x: 430, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 35;

        // SECTION 1: REQUESTER STAFF
        page.drawText("REQUESTER STAFF", {
            x: 50, y, size: 10, font: helveticaBold, color: brownColor,
        });
        page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: width - 50, y: y - 5 }, thickness: 1, color: brownColor });
        y -= 25;

        page.drawText("Full Name :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.fullName, { x: 140, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 138, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        page.drawText("Department :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.department, { x: 165, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 163, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        page.drawText("Contact No. :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.contactNo, { x: 185, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 183, y: y - 4 }, end: { x: 320, y: y - 4 }, thickness: 0.5, color: lightGray });

        page.drawText("E-Mail  :", { x: 330, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.email, { x: 375, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 373, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 35;

        // SECTION 2: REQUEST DETAILS
        page.drawText("REQUEST DETAILS", {
            x: 50, y, size: 10, font: helveticaBold, color: brownColor,
        });
        page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: width - 50, y: y - 5 }, thickness: 1, color: brownColor });
        y -= 25;

        page.drawText("Objective :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        const objectiveText = formData.objective || "";
        page.drawText(objectiveText.substring(0, 70), { x: 180, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 178, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 18;

        let secondaryObjText = objectiveText.length > 70 ? objectiveText.substring(70, 140) : "";

        if (secondaryObjText) {
            page.drawText(secondaryObjText.substring(0, 80), { x: 100, y, size: 9, font: helvetica, color: textColor });
        }
        page.drawLine({ start: { x: 98, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 30;

        // SECTION 3: Promotional Channels
        page.drawText("Promotional Channels", {
            x: 50, y, size: 9, font: helveticaBold, color: labelColor,
        });
        page.drawText("*Choose your type of Promotional Channels", {
            x: 55, y: y - 12, size: 6.5, font: helvetica, color: rgb(0.6, 0.6, 0.6),
        });
        y -= 30;

        const channels = ["Facebook", "Youtube", "Google", "IG", "Line", "Other", "Tiktok", "WeChat"];
        const selectedChannels = Array.isArray(formData.promotionalChannels) ? formData.promotionalChannels.map((c: any) => c.channel) : [];
        const colWidth = (width - 100) / 3;

        channels.forEach((ch, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const cx = 55 + col * colWidth;
            const cy = y - row * 20;

            const isChecked = selectedChannels.includes(ch);

            page.drawRectangle({ x: cx, y: cy - 3, width: 10, height: 10, borderColor: lineColor, borderWidth: 0.5 });
            if (isChecked) {
                page.drawText("โ“", { x: cx + 1.5, y: cy - 1.5, size: 9, font: helveticaBold, color: textColor });
            }
            page.drawText(ch, { x: cx + 15, y: cy, size: 8.5, font: helvetica, color: textColor });
        });

        y -= 65;

        // DATES
        page.drawText("Booking Date :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.bookingDate), { x: 230, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 228, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        page.drawText("Effective Date :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.effectiveDate), { x: 230, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 228, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        page.drawText("Start Date :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.startDate), { x: 160, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 158, y: y - 4 }, end: { x: 280, y: y - 4 }, thickness: 0.5, color: lightGray });

        page.drawText("End Date :", { x: 300, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.endDate), { x: 400, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 398, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        page.drawText("Amount :", { x: 50, y: y, size: 8.5, font: helvetica, color: labelColor });
        const amountStr = formData.amount ? `${parseFloat(formData.amount).toLocaleString()} THB` : "";
        page.drawText(amountStr, { x: 175, y: y, size: 9, font: helveticaBold, color: textColor });
        page.drawLine({ start: { x: 173, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 35;

        // SIGNATURES
        page.drawText("REQUESTER SIGNATURE", {
            x: 50, y, size: 10, font: helveticaBold, color: brownColor,
        });
        page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: width - 50, y: y - 5 }, thickness: 0.5, color: brownColor });
        y -= 30;

        page.drawText("Signature  :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 110, y: y - 4 }, end: { x: 280, y: y - 4 }, thickness: 0.5, color: lightGray });
        page.drawText("Date  :", { x: 300, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 335, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 40;

        page.drawText("AUTHORIZER", {
            x: 50, y, size: 10, font: helveticaBold, color: brownColor,
        });
        page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: width - 50, y: y - 5 }, thickness: 0.5, color: brownColor });
        y -= 30;

        page.drawText("Signature  :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 110, y: y - 4 }, end: { x: 280, y: y - 4 }, thickness: 0.5, color: lightGray });
        page.drawText("Date  :", { x: 300, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 335, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 40;

        page.drawText("FA  DEPARTMENT USE ONLY", {
            x: 50, y, size: 10, font: helveticaBold, color: textColor,
        });
        y -= 25;

        page.drawText("Verified By :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 190, y: y - 4 }, end: { x: 310, y: y - 4 }, thickness: 0.5, color: lightGray });
        page.drawText("Date  :", { x: 340, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 370, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });

        void y;

        const pdfBytes = await pdfDoc.save();
        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="card-request-${formData.eventId}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
