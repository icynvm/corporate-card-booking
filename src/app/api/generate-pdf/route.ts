import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.json();

        // Create a new PDF document (A4 size)
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points

        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const { width, height } = page.getSize();
        const textColor = rgb(0.15, 0.15, 0.15);
        const labelColor = rgb(0.4, 0.4, 0.4);
        const accentColor = rgb(0.39, 0.4, 0.95); // brand-500
        const lineColor = rgb(0.9, 0.9, 0.9);

        let yPos = height - 60;

        // ── Header ──
        page.drawRectangle({
            x: 0,
            y: height - 100,
            width: width,
            height: 100,
            color: rgb(0.95, 0.96, 1),
        });

        page.drawText("CORPORATE EXECUTIVE CARD", {
            x: 50,
            y: height - 45,
            size: 18,
            font: helveticaBold,
            color: accentColor,
        });

        page.drawText("Card Usage Request Form", {
            x: 50,
            y: height - 68,
            size: 11,
            font: helvetica,
            color: labelColor,
        });

        // Auto-generated Event ID
        const eventId = `REQ-${new Date().getFullYear()}-${String(
            Math.floor(Math.random() * 9999)
        ).padStart(4, "0")}`;

        page.drawText(`Event ID: ${eventId}`, {
            x: width - 200,
            y: height - 45,
            size: 10,
            font: helveticaBold,
            color: textColor,
        });

        page.drawText(`Date: ${new Date().toLocaleDateString("en-GB")}`, {
            x: width - 200,
            y: height - 62,
            size: 9,
            font: helvetica,
            color: labelColor,
        });

        yPos = height - 130;

        // ── Section: Requester Information ──
        const drawSectionHeader = (title: string, y: number): number => {
            page.drawRectangle({
                x: 40,
                y: y - 5,
                width: width - 80,
                height: 22,
                color: rgb(0.95, 0.96, 1),
                borderColor: accentColor,
                borderWidth: 0.5,
            });
            page.drawText(title, {
                x: 50,
                y: y,
                size: 10,
                font: helveticaBold,
                color: accentColor,
            });
            return y - 30;
        };

        const drawField = (label: string, value: string, x: number, y: number, fieldWidth: number = 220): number => {
            page.drawText(label, {
                x,
                y,
                size: 8,
                font: helvetica,
                color: labelColor,
            });
            page.drawText(value || "—", {
                x,
                y: y - 14,
                size: 10,
                font: helvetica,
                color: textColor,
            });
            // Underline
            page.drawLine({
                start: { x, y: y - 18 },
                end: { x: x + fieldWidth, y: y - 18 },
                thickness: 0.5,
                color: lineColor,
            });
            return y - 35;
        };

        yPos = drawSectionHeader("REQUESTER INFORMATION", yPos);

        // Row 1: Name & Department
        drawField("Full Name", formData.fullName || "", 50, yPos, 220);
        drawField("Department", formData.department || "", 310, yPos, 220);
        yPos -= 35;

        // Row 2: Contact & Project
        drawField("Contact No.", formData.contactNo || "", 50, yPos, 220);
        drawField("Project", formData.projectId || "", 310, yPos, 220);
        yPos -= 35;

        // ── Section: Request Details ──
        yPos = drawSectionHeader("REQUEST DETAILS", yPos);

        // Row: Objective
        drawField("Objective", formData.objective || "", 50, yPos, 480);
        yPos -= 35;

        // Row: Dates
        drawField("Booking Date", formData.bookingDate || "", 50, yPos, 140);
        drawField("Start Date", formData.startDate || "", 210, yPos, 140);
        drawField("End Date", formData.endDate || "", 370, yPos, 140);
        yPos -= 35;

        // Row: Amount & Billing
        const billingLabel = (formData.billingType || "")
            .replace("ONE_TIME", "One-time")
            .replace("MONTHLY", "Monthly")
            .replace("YEARLY", "Yearly");
        drawField("Amount (THB)", formData.amount?.toLocaleString() || "0", 50, yPos, 220);
        drawField("Billing Type", billingLabel, 310, yPos, 220);
        yPos -= 35;

        // ── Section: Promotional Channels ──
        if (formData.promotionalChannels && formData.promotionalChannels.length > 0) {
            yPos = drawSectionHeader("PROMOTIONAL CHANNELS", yPos);

            for (const ch of formData.promotionalChannels) {
                if (yPos < 100) {
                    // Add new page if running out of space
                    const extraPage = pdfDoc.addPage([595.28, 841.89]);
                    yPos = extraPage.getSize().height - 60;
                }

                page.drawText(`● ${ch.channel}`, {
                    x: 55,
                    y: yPos,
                    size: 10,
                    font: helveticaBold,
                    color: textColor,
                });
                yPos -= 18;

                drawField("Media Account", ch.mediaAccountEmail || "", 70, yPos, 200);
                drawField("Access List", ch.accessList || "", 310, yPos, 200);
                yPos -= 35;
            }
        }

        // ── Footer: Signature Lines ──
        void yPos; // consumed above

        page.drawLine({
            start: { x: 50, y: 120 },
            end: { x: 230, y: 120 },
            thickness: 0.5,
            color: textColor,
        });
        page.drawText("Requester Signature", {
            x: 90,
            y: 105,
            size: 9,
            font: helvetica,
            color: labelColor,
        });

        page.drawLine({
            start: { x: 370, y: 120 },
            end: { x: 545, y: 120 },
            thickness: 0.5,
            color: textColor,
        });
        page.drawText("Manager Approval", {
            x: 415,
            y: 105,
            size: 9,
            font: helvetica,
            color: labelColor,
        });

        // Footer text
        page.drawText("Generated by Corporate Card Booking System", {
            x: 50,
            y: 40,
            size: 7,
            font: helvetica,
            color: rgb(0.7, 0.7, 0.7),
        });

        page.drawText(`Generated: ${new Date().toLocaleString("en-GB")}`, {
            x: width - 200,
            y: 40,
            size: 7,
            font: helvetica,
            color: rgb(0.7, 0.7, 0.7),
        });

        // Serialize to bytes
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
