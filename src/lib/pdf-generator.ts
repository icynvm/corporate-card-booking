import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { IMPACT_LOGO_BASE64 } from "./logo-base64";

export interface RequestPdfData {
    eventId: string;
    fullName: string;
    department: string;
    contactNo: string;
    email: string;
    objective: string;
    projectName: string;
    promotionalChannels?: any[];
    bookingDate?: string | null;
    effectiveDate?: string | null;
    startDate?: string;
    endDate?: string;
    amount?: string | number;
}

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

export async function generateRequestPdf(formData: RequestPdfData): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4

    // Load custom Thai font (Sarabun)
    const fs = await import("fs");
    const path = await import("path");
    const fontRegularBytes = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "Sarabun-Regular.ttf"));
    const fontBoldBytes = fs.readFileSync(path.join(process.cwd(), "public", "fonts", "Sarabun-Bold.ttf"));

    const helvetica = await pdfDoc.embedFont(fontRegularBytes);
    const helveticaBold = await pdfDoc.embedFont(fontBoldBytes);

    const { width, height } = page.getSize();
    const textColor = rgb(0.15, 0.15, 0.15);
    const labelColor = rgb(0.35, 0.35, 0.35);
    const brownColor = rgb(0.55, 0.32, 0.15);
    const lineColor = rgb(0.7, 0.7, 0.7);
    const lightGray = rgb(0.85, 0.85, 0.85);

    let y = height - 50;

    // Header Logo
    const logoBytes = Buffer.from(IMPACT_LOGO_BASE64.split(",")[1], "base64");
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.10);
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

    page.drawText("Team :", { x: 50, y, size: 8.5, font: helvetica, color: labelColor });
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
    const selectedChannels = Array.isArray(formData.promotionalChannels) 
        ? formData.promotionalChannels.map((c: any) => typeof c === "string" ? c : c?.channel).filter(Boolean)
        : [];
    const colWidth = (width - 100) / 3;

    channels.forEach((ch, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const cx = 55 + col * colWidth;
        const cy = y - row * 20;
        const isChecked = selectedChannels.includes(ch);

        page.drawRectangle({ x: cx, y: cy - 3, width: 10, height: 10, borderColor: lineColor, borderWidth: 0.5 });
        if (isChecked) {
            page.drawText("X", { x: cx + 2.5, y: cy - 1.5, size: 8, font: helveticaBold, color: textColor });
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
    const amountStr = formData.amount ? `${parseFloat(String(formData.amount)).toLocaleString()} THB` : "";
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

    return await pdfDoc.save();
}
