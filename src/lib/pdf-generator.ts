import { PDFDocument, rgb } from "pdf-lib";
// @ts-ignore
import fontkit from "./fontkit";
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

const normalizeThai = (text: string = "") => {
    if (!text) return "";
    return text
        .normalize("NFC")
        // Swap Consonant + Vowel + Tone to Consonant + Tone + Vowel
        // Includes า (\u0E32) to prevent advance floating stalls
        .replace(/([ิีึืุูา])([\u0E48-\u0E4D])/g, "$2$1")
        .replace(/\u0E33\u0E32/g, "\u0E33");
};

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
    pdfDoc.registerFontkit(fontkit as any);

    // 1. Load Fonts Client Side
    const fontBytes = await fetch('/fonts/Sarabun-Regular.ttf').then(res => res.arrayBuffer());
    const fontBoldBytes = await fetch('/fonts/Sarabun-Bold.ttf').then(res => res.arrayBuffer());

    const fontRegular = await pdfDoc.embedFont(fontBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    let y = height - 40; // Start at top

    // 2. Logo
    try {
        const logoPngBytes = Uint8Array.from(atob(IMPACT_LOGO_BASE64), c => c.charCodeAt(0));
        const logoImage = await pdfDoc.embedPng(logoPngBytes);
        page.drawImage(logoImage, {
            x: width - 130,
            y: height - 55,
            width: 90,
            height: 25
        });
    } catch (e) {
        console.error("Logo embed failed:", e);
    }

    // 3. Title Row
    y -= 25;
    page.drawText('แบบฟอร์มขอใช้ CORPORATE EXECUTIVE CARD', { x: 130, y, font: fontBold, size: 12 });
    y -= 25;
    page.drawText('CARD NO.', { x: 210, y, font: fontBold, size: 10.5 });
    page.drawLine({ start: { x: 260, y: y-3 }, end: { x: 420, y: y-3 }, thickness: 0.8 });

    y -= 35;

    // --- Helpers ---
    const drawSectionHeader = (english: string, thai: string) => {
        page.drawText(`${english} / ${thai}`, { x: 40, y, font: fontBold, size: 10.5, color: rgb(0.55, 0.35, 0.2) });
        page.drawLine({ start: { x: 40, y: y - 5 }, end: { x: width - 40, y: y - 5 }, thickness: 1, color: rgb(0.55, 0.35, 0.2) });
        y -= 25;
    };

    const drawField = (label: string, value: string) => {
        page.drawText(label, { x: 40, y, font: fontRegular, size: 9 });
        const labelWidth = fontRegular.widthOfTextAtSize(label, 9);
        const valueX = 40 + labelWidth + 5;
        page.drawText(value, { x: valueX, y, font: fontRegular, size: 9 });
        page.drawLine({ start: { x: valueX - 2, y: y - 3 }, end: { x: width - 40, y: y - 3 }, thickness: 0.6, color: rgb(0,0,0) });
        y -= 22;
    };

    const drawTwoColumnField = (label1: string, value1: string, label2: string, value2: string) => {
        const midX = width / 2;
        
        page.drawText(label1, { x: 40, y, font: fontRegular, size: 9 });
        const l1Width = fontRegular.widthOfTextAtSize(label1, 9);
        const v1X = 40 + l1Width + 5;
        page.drawText(value1, { x: v1X, y, font: fontRegular, size: 9 });
        page.drawLine({ start: { x: v1X - 2, y: y - 3 }, end: { x: midX - 20, y: y - 3 }, thickness: 0.6 });

        page.drawText(label2, { x: midX, y, font: fontRegular, size: 9 });
        const l2Width = fontRegular.widthOfTextAtSize(label2, 9);
        const v2X = midX + l2Width + 5;
        page.drawText(value2, { x: v2X, y, font: fontRegular, size: 9 });
        page.drawLine({ start: { x: v2X - 2, y: y - 3 }, end: { x: width - 40, y: y - 3 }, thickness: 0.6 });

        y -= 22;
    };

    // --- Content ---
    drawSectionHeader('REQUESTER STAFF', 'พนักงานผู้ขอใช้');
    drawField('Full Name/ ชื่อ :', normalizeThai(formData.fullName));
    drawField('Department / แผนก :', normalizeThai(formData.department));
    drawTwoColumnField('Contact No. / เบอร์ติดต่อ :', formData.contactNo, 'E-Mail :', formData.email);

    y -= 15;
    drawSectionHeader('REQUEST DETAILS', 'รายละเอียดการขอใช้');
    drawField('Objective / วัตถุประสงค์ :', normalizeThai(formData.objective));

    y -= 10;
    page.drawText('Promotional Channels / ช่องทางในการโฆษณา', { x: 40, y, font: fontBold, size: 9 });
    y -= 12;
    page.drawText('*Choose your type of Promotional Channels', { x: 40, y, font: fontRegular, size: 6.5, color: rgb(0.4, 0.4, 0.4) });
    y -= 20;

    const channels = Array.isArray(formData.promotionalChannels) 
        ? formData.promotionalChannels.map((c: any) => typeof c === "string" ? c : c?.channel)
        : [];

    const drawCheckbox = (label: string, xPos: number, yPos: number) => {
        const isChecked = channels.includes(label);
        page.drawRectangle({ x: xPos, y: yPos, width: 8, height: 8, borderWidth: 0.8, borderColor: rgb(0.3, 0.3, 0.3) });
        if (isChecked) {
            page.drawLine({ start: { x: xPos+2, y: yPos+4 }, end: { x: xPos+4, y: yPos+2 }, thickness: 1.2 });
            page.drawLine({ start: { x: xPos+4, y: yPos+2 }, end: { x: xPos+7, y: yPos+7 }, thickness: 1.2 });
        }
        page.drawText(label, { x: xPos + 12, y: yPos+1, font: fontRegular, size: 8.5 });
    };

    const startYCheckbox = y;
    drawCheckbox('Facebook', 40, startYCheckbox);
    drawCheckbox('IG', 40, startYCheckbox - 15);
    drawCheckbox('Tiktok', 40, startYCheckbox - 30);

    drawCheckbox('Youtube', 160, startYCheckbox);
    drawCheckbox('Line', 160, startYCheckbox - 15);
    drawCheckbox('WeChat', 160, startYCheckbox - 30);

    drawCheckbox('Google', 280, startYCheckbox);
    drawCheckbox('Other', 280, startYCheckbox - 15);

    y -= 50;
    
    // Dates
    drawField('Booking Date / วันที่สั่งซื้อโฆษณา :', fmtDate(formData.bookingDate));
    drawField('Effective Date / วันที่โฆษณาเริ่มมีผล :', fmtDate(formData.effectiveDate));
    drawTwoColumnField('Start Date / วันเริ่ม :', fmtDate(formData.startDate), 'End Date / วันสิ้นสุด :', fmtDate(formData.endDate));
    y -= 5;
    drawField('Amount / จำนวนเงิน :', formData.amount ? `${parseFloat(String(formData.amount)).toLocaleString()} THB` : "");

    y -= 25;
    drawSectionHeader('REQUESTER SIGNATURE', 'ลงชื่อผู้ขอใช้');
    drawTwoColumnField('Signature :', '_______________________', 'Date :', '_______________________');

    y -= 20;
    drawSectionHeader('AUTHORIZER', 'ลงชื่อผู้อนุมัติ');
    drawTwoColumnField('Signature :', '_______________________', 'Date :', '_______________________');

    y -= 20;
    page.drawText('FA DEPARTMENT USE ONLY', { x: 40, y, font: fontBold, size: 10.5 });
    y -= 20;
    drawTwoColumnField('Verified By / ตรวจสอบโดย :', '_______________________', 'Date :', '_______________________');

    return pdfDoc.save();
}
