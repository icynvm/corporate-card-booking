import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";
import { IMPACT_LOGO_BASE64 } from "./logo-base64";
import { SARABUN_REGULAR_BASE64, SARABUN_BOLD_BASE64 } from "./fonts-base64";

export async function generatePuppeteerPDF(formData: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(
            "https://github.com/Sparticuz/chromium/releases/download/v122.0.0/chromium-v122.0.0-pack.tar"
        ),
        headless: true,
    });

    const page = await browser.newPage();

    // ✅ Thai normalize (ตัวจริง)
    const normalizeThai = (text: string = "") => {
        return text
            .normalize("NFC")
            .replace(/([\u0E48-\u0E4C])([\u0E31-\u0E3A])/g, "$2$1")
            .replace(/า([\u0E48-\u0E4C])/g, "$1า")
            .replace(/\u0E33\u0E32/g, "\u0E33");
    };

    // ✅ sanitize object ทั้งก้อน
    const sanitize = (obj: any): any => {
        if (typeof obj === "string") return normalizeThai(obj);

        if (Array.isArray(obj)) return obj.map(sanitize);

        if (obj && typeof obj === "object") {
            const out: any = {};
            for (const k in obj) out[k] = sanitize(obj[k]);
            return out;
        }

        return obj;
    };

    // ✅ escape HTML กันพัง
    const escapeHtml = (str: string = "") =>
        str.replace(/[&<>"']/g, (m) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;",
        }[m]!));

    // 🔥 สำคัญ: clean data ตรงนี้
    const cleanData = sanitize(formData);

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

    const formatCurrency = (amount: any) => {
        return amount ? `${parseFloat(String(amount)).toLocaleString()} THB` : "";
    };

    const selectedChannels = Array.isArray(cleanData.promotionalChannels)
        ? cleanData.promotionalChannels
            .map((c: any) => typeof c === "string" ? c : c?.channel)
            .filter(Boolean)
        : [];

    const channels = ["Facebook", "Youtube", "Google", "IG", "Line", "Other", "Tiktok", "WeChat"];
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <style>
            @font-face {
                font-family: 'Sarabun';
                src: url(data:font/ttf;base64,${SARABUN_REGULAR_BASE64}) format('truetype');
                font-weight: normal;
                font-style: normal;
            }
            @font-face {
                font-family: 'Sarabun';
                src: url(data:font/ttf;base64,${SARABUN_BOLD_BASE64}) format('truetype');
                font-weight: bold;
                font-style: normal;
            }
            
            body {
                font-family: 'Sarabun', sans-serif;
                font-size: 11px;
                color: #262626;
                padding: 40px;
                line-height: 1.4;
            }

            .header {
                position: relative;
                text-align: center;
                margin-bottom: 30px;
            }

            .logo {
                position: absolute;
                top: -10px;
                right: 0;
                width: 70px;
            }

            .title {
                font-size: 14px;
                font-weight: bold;
                margin-top: 10px;
            }

            .card-no {
                margin: 15px auto;
                text-align: center;
                font-weight: bold;
                border-bottom: 1px solid #d4d4d4;
                width: 200px;
                padding-bottom: 3px;
            }

            .section-title {
                color: #8B5A2B;
                font-weight: bold;
                font-size: 12px;
                border-bottom: 2px solid #8B5A2B;
                margin-top: 20px;
                padding-bottom: 4px;
            }

            .field-row {
                display: flex;
                margin-top: 12px;
                align-items: baseline;
            }

            .field-label {
                color: #595959;
                width: 90px;
            }

            .field-value {
                flex: 1;
                border-bottom: 1px solid #e5e5e5;
                padding-bottom: 2px;
                padding-left: 8px;
            }

            .field-row-half {
                display: flex;
                gap: 20px;
                width: 100%;
            }

            .field-half {
                flex: 1;
                display: flex;
                align-items: baseline;
                margin-top: 12px;
            }

            .channels-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-top: 10px;
                padding-left: 10px;
            }

            .checkbox-item {
                display: flex;
                align-items: center;
                font-size: 10px;
            }

            .checkbox-box {
                width: 11px;
                height: 11px;
                border: 1px solid #a3a3a3;
                margin-right: 6px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: bold;
            }

            .signature-section {
                margin-top: 30px;
                display: flex;
                justify-content: space-between;
                gap: 40px;
            }

            .signature-box {
                flex: 1;
            }

            .signature-line {
                border-bottom: 1px solid #d4d4d4;
                margin-top: 35px;
                margin-bottom: 4px;
            }

            .signature-label {
                font-size: 9px;
                color: #595959;
                text-align: left;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <img class="logo" src="${IMPACT_LOGO_BASE64}" alt="Logo" />
            <div class="title">CORPORATE EXECUTIVE CARD REQUEST FORM</div>
            <div class="card-no" style="font-size: 10px;">CARD NO. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
        </div>

        <!-- SECTION 1 -->
        <div class="section-title">REQUESTER STAFF</div>
        <div class="field-row">
            <div class="field-label">Full Name :</div>
            <div class="field-value">${escapeHtml(cleanData.fullName || "")}</div>
        </div>
        <div class="field-row">
            <div class="field-label">Team :</div>
            <div class="field-value">${escapeHtml(cleanData.department || "")}</div>
        </div>
        <div class="field-row-half">
            <div class="field-half">
                <div class="field-label">Contact No. :</div>
                <div class="field-value">${escapeHtml(cleanData.contactNo || "")}</div>
            </div>
            <div class="field-half">
                <div class="field-label" style="width: 50px;">E-Mail :</div>
                <div class="field-value">${escapeHtml(cleanData.email || "")}</div>
            </div>
        </div>

        <!-- SECTION 2 -->
        <div class="section-title">REQUEST DETAILS</div>
        <div class="field-row">
            <div class="field-label">Objective :</div>
            <div class="field-value" style="min-height: 40px;">${escapeHtml(cleanData.objective || "")}</div>
        </div>

        <div style="margin-top: 15px; font-weight: bold; color: #595959;">Promotional Channels</div>
        <div style="font-size: 8px; color: #8c8c8c; margin-top: 2px;">*Choose your type of Promotional Channels</div>
        <div class="channels-grid">
            ${channels.map(ch => `
                <div class="checkbox-item">
                    <div class="checkbox-box">${selectedChannels.includes(ch) ? "X" : ""}</div>
                    <div>${ch}</div>
                </div>
            `).join('')}
        </div>

        <!-- DATES -->
        <div style="margin-top: 20px;"></div>
        <div class="field-row">
            <div class="field-label" style="width: 140px;">Booking Date :</div>
            <div class="field-value">${fmtDate(formData.bookingDate)}</div>
        </div>
        <div class="field-row">
            <div class="field-label" style="width: 140px;">Effective Date :</div>
            <div class="field-value">${fmtDate(formData.effectiveDate)}</div>
        </div>
        <div class="field-row-half">
            <div class="field-half">
                <div class="field-label">Start Date :</div>
                <div class="field-value">${fmtDate(formData.startDate)}</div>
            </div>
            <div class="field-half">
                <div class="field-label" style="width: 70px;">End Date :</div>
                <div class="field-value">${fmtDate(formData.endDate)}</div>
            </div>
        </div>
        <div class="field-row" style="margin-top: 15px;">
            <div class="field-label" style="width: 140px; font-weight: bold;">Amount :</div>
            <div class="field-value" style="font-weight: bold;">${formatCurrency(formData.amount)}</div>
        </div>

        <!-- SIGNATURES -->
        <div class="section-title">REQUESTER SIGNATURE</div>
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Signature</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Date</div>
            </div>
        </div>

        <div class="section-title">AUTHORIZER</div>
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Signature</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Date</div>
            </div>
        </div>

        <div style="margin-top: 25px; font-weight: bold;">FA DEPARTMENT USE ONLY</div>
        <div class="signature-section" style="margin-top: 15px;">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Verified By</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Date</div>
            </div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });

    await browser.close();

    // Convert to Uint8Array for compatibility if needed, but pdf-lib uses Buffer often.
    // page.pdf returns a Buffer in Node environments.
    return Buffer.from(pdfBuffer);
}
