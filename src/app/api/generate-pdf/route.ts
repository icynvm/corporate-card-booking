import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { IMPACT_LOGO_BASE64 } from "@/lib/logo-base64";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.json();
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

        // Helper: draw underlined field
        const drawField = (label: string, value: string, x: number, yPos: number, fieldWidth: number) => {
            page.drawText(label, { x, y: yPos, size: 8, font: helvetica, color: labelColor });
            page.drawText(value || "", { x: x + 5, y: yPos - 14, size: 9, font: helvetica, color: textColor });
            page.drawLine({ start: { x, y: yPos - 18 }, end: { x: x + fieldWidth, y: yPos - 18 }, thickness: 0.5, color: lightGray });
        };

        // Helper: format date to Long Form (9 March 2026)
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

        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        // HEADER
        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        const logoBytes = Buffer.from(IMPACT_LOGO_BASE64.split(",")[1], "base64");
        const logoImage = await pdfDoc.embedPng(logoBytes);
        const logoDims = logoImage.scale(0.15); // Smaller logo
        page.drawImage(logoImage, {
            x: width - logoDims.width - 25, // Extreme top right
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

        // Hidden from page content as requested, but used for filename
        const eventId = formData.eventId || `REQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
        // page.drawText(eventId, { x: 275, y, size: 10, font: helvetica, color: textColor });
        y -= 35;

        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        // SECTION 1: REQUESTER STAFF
        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        page.drawText("REQUESTER STAFF", {
            x: 50, y, size: 10, font: helveticaBold, color: brownColor,
        });
        page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: width - 50, y: y - 5 }, thickness: 1, color: brownColor });
        y -= 25;

        // Full Name
        page.drawText("Full Name :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.fullName || "", { x: 140, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 138, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        // Department
        page.drawText("Department :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.department || "", { x: 165, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 163, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        // Contact No. + E-Mail
        page.drawText("Contact No. :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.contactNo || "", { x: 185, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 183, y: y - 4 }, end: { x: 320, y: y - 4 }, thickness: 0.5, color: lightGray });

        page.drawText("E-Mail  :", { x: 330, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(formData.email || "", { x: 375, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 373, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 35;

        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        // SECTION 2: REQUEST DETAILS
        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        page.drawText("REQUEST DETAILS", {
            x: 50, y, size: 10, font: helveticaBold, color: brownColor,
        });
        page.drawLine({ start: { x: 50, y: y - 5 }, end: { x: width - 50, y: y - 5 }, thickness: 1, color: brownColor });
        y -= 25;

        // Objective
        page.drawText("Objective :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        const objectiveText = formData.objective || "";
        page.drawText(objectiveText.substring(0, 70), { x: 180, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 178, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 18;
        if (objectiveText.length > 70) {
            page.drawText(objectiveText.substring(70, 140), { x: 100, y, size: 9, font: helvetica, color: textColor });
        }
        page.drawLine({ start: { x: 98, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 30;

        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        // SECTION 3: Promotional Channels
        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        page.drawText("Promotional Channels", {
            x: 50, y, size: 9, font: helveticaBold, color: labelColor,
        });
        page.drawText("*Choose your type of Promotional Channels", {
            x: 55, y: y - 12, size: 6.5, font: helvetica, color: rgb(0.6, 0.6, 0.6),
        });
        y -= 30;

        const channels = ["Facebook", "Youtube", "Google", "IG", "Line", "Other", "Tiktok", "WeChat"];
        const selectedChannels = (formData.promotionalChannels || []).map((c: { channel: string }) => c.channel);
        const colWidth = (width - 100) / 3;

        channels.forEach((ch, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const cx = 55 + col * colWidth;
            const cy = y - row * 20;

            const isChecked = selectedChannels.includes(ch);

            // Checkbox
            page.drawRectangle({ x: cx, y: cy - 3, width: 10, height: 10, borderColor: lineColor, borderWidth: 0.5 });
            if (isChecked) {
                page.drawText("โ“", { x: cx + 1.5, y: cy - 1.5, size: 9, font: helveticaBold, color: textColor });
            }
            page.drawText(ch, { x: cx + 15, y: cy, size: 8.5, font: helvetica, color: textColor });
        });

        y -= 65;

        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        // DATES
        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        page.drawText("Booking Date :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.bookingDate), { x: 230, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 228, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        page.drawText("Effective Date :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.effectiveDate), { x: 230, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 228, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        // Start + End
        page.drawText("Start Date :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.startDate), { x: 160, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 158, y: y - 4 }, end: { x: 280, y: y - 4 }, thickness: 0.5, color: lightGray });

        page.drawText("End Date :", { x: 300, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawText(fmtDate(formData.endDate), { x: 400, y, size: 9, font: helvetica, color: textColor });
        page.drawLine({ start: { x: 398, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 22;

        // Amount
        page.drawText("Amount :", { x: 50, y: y, size: 8.5, font: helvetica, color: labelColor });
        const amountStr = formData.amount ? `${parseFloat(formData.amount).toLocaleString()} THB` : "";
        page.drawText(amountStr, { x: 175, y: y, size: 9, font: helveticaBold, color: textColor });
        page.drawLine({ start: { x: 173, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });
        y -= 35;

        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•
        // SIGNATURES
        // โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•โ•

        // Requester Signature
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

        // Authorizer Signature
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

        // FA Department Use Only
        page.drawText("FA  DEPARTMENT USE ONLY", {
            x: 50, y, size: 10, font: helveticaBold, color: textColor,
        });
        y -= 25;

        page.drawText("Verified By :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 190, y: y - 4 }, end: { x: 310, y: y - 4 }, thickness: 0.5, color: lightGray });
        page.drawText("Date  :", { x: 340, y, size: 8.5, font: helvetica, color: labelColor });
        page.drawLine({ start: { x: 370, y: y - 4 }, end: { x: width - 50, y: y - 4 }, thickness: 0.5, color: lightGray });

        // Suppress unused y warning
        void y;

        // Serialize
        const pdfBytes = await pdfDoc.save();
        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="card-request-${eventId}.pdf"`,
            },
        });
    } catch (error) {
        console.error("PDF generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
