import pdfMake from "./pdfmake-fonts";
import { IMPACT_LOGO_BASE64 } from "./logo-base64";
import { normalizeThai, insertZeroWidthSpaces } from "./thai-utils";

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
    creditCardNo?: string | null;
    eventDetails?: { eventId: string, accountCode: string }[];
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

// normalizeThai imported from thai-utils

export async function generateRequestPdf(formData: RequestPdfData): Promise<Uint8Array> {
    const standardChannels = ["Facebook", "IG", "Tiktok", "Youtube", "Line", "WeChat", "Google"];
    
    const selectedChannels = Array.isArray(formData.promotionalChannels)
        ? formData.promotionalChannels.map((c: any) => typeof c === "string" ? c : c?.channel).filter(Boolean)
        : [];

    const otherMedia = selectedChannels.find(c => !standardChannels.includes(c)) || "";

    const getCheckbox = (label: string) => {
        const isChecked = selectedChannels.includes(label);
        return {
            columns: [
                {
                    canvas: [
                        { type: 'rect', x: 0, y: 1, w: 9, h: 9, lineWidth: 0.8, lineColor: '#555555' },
                        ...(isChecked ? [
                            { type: 'line', x1: 2, y1: 5, x2: 4, y2: 8, lineWidth: 1.5, lineColor: '#222222' },
                            { type: 'line', x1: 4, y1: 8, x2: 8, y2: 2, lineWidth: 1.5, lineColor: '#222222' }
                        ] : [])
                    ],
                    width: 14
                },
                { text: label, fontSize: 8.5 }
            ],
            margin: [0, 3, 0, 3]
        };
    };

    const checkboxOther = (label: string, otherValue: string) => {
        const isChecked = !!otherValue;
        return {
            columns: [
                {
                    canvas: [
                        { type: 'rect', x: 0, y: 1, w: 9, h: 9, lineWidth: 0.8, lineColor: '#555555' },
                        ...(isChecked ? [
                            { type: 'line', x1: 2, y1: 5, x2: 4, y2: 8, lineWidth: 1.5, lineColor: '#222222' },
                            { type: 'line', x1: 4, y1: 8, x2: 8, y2: 2, lineWidth: 1.5, lineColor: '#222222' }
                        ] : [])
                    ],
                    width: 14
                },
                { text: label + ' : ', fontSize: 8.5 },
                { text: normalizeThai(otherValue) || "__________________________", fontSize: 8.5, decoration: otherValue ? 'underline' : undefined }
            ],
            margin: [0, 3, 0, 3]
        };
    };

    const getUnderlinedField = (label: string, value: string, width1: number = 80) => {
        return {
            table: {
                widths: [width1, '*'],
                body: [
                    [
                        { text: label, style: 'label', border: [false, false, false, false] },
                        { text: value, style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]
                ]
            },
            margin: [0, 3, 0, 3]
        };
    };

    const getTwoColumnUnderlinedField = (label1: string, value1: string, width1: number, label2: string, value2: string, width2: number = 60) => {
        return {
            table: {
                widths: [width1, '*', width2, '*'], // stretched weights
                body: [
                    [
                        { text: label1, style: 'label', border: [false, false, false, false] },
                        { text: value1, style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] },
                        { text: label2, style: 'label', border: [false, false, false, false] },
                        { text: value2, style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]
                ]
            },
            margin: [0, 3, 0, 3]
        };
    };

    const getMultiLineUnderlinedField = (label: string, value: string, width1: number = 80, linesCount: number = 3) => {
        const lines: string[] = [];
        let currentLine = "";
        const maxFirstLine = 75; 
        const maxOtherLine = 95; 

        if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
            try {
                const segmenter = new (Intl as any).Segmenter("th", { granularity: "word" });
                const segments = Array.from(segmenter.segment(value || "")) as any[];
                for (let i = 0; i < segments.length; i++) {
                    const word = segments[i].segment;
                    const limit = lines.length === 0 ? maxFirstLine : maxOtherLine;
                    if ((currentLine + word).length > limit) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine += word;
                    }
                }
            } catch (err) {
                console.error("Segmenter failed in PDF generation", err);
            }
        }
        if (currentLine) lines.push(currentLine);

        // Fallback or pad
        if (lines.length === 0 && value) {
            lines.push(value.slice(0, maxFirstLine));
            let rem = value.slice(maxFirstLine);
            while (rem.length > 0) {
                lines.push(rem.slice(0, maxOtherLine));
                rem = rem.slice(maxOtherLine);
            }
        }

        const parts: any[] = [
            {
                table: {
                    widths: [width1, '*'],
                    body: [[
                        { text: label, style: 'label', border: [false, false, false, false] },
                        { text: lines[0] || '', style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]]
                },
                margin: [0, 3, 0, 1]
            }
        ];

        for (let i = 1; i < linesCount; i++) {
            parts.push({
                table: {
                    widths: ['*'],
                    body: [[
                        { 
                            text: lines[i] || '', 
                            style: 'value', 
                            border: [false, false, false, true], 
                            borderColor: ['', '', '', '#6d4c41'] 
                        }
                    ]]
                },
                margin: [0, 5, 0, 1] // spacing for underline
            });
        }
        return parts;
    };



    const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 30, 40, 30],
        content: [
            {
                columns: [
                    { text: '', width: '*' },
                    {
                        image: 'logo',
                        width: 90,
                        alignment: 'right'
                    }
                ]
            },
            { text: 'แบบฟอร์มขอใช้ CORPORATE EXECUTIVE CARD', style: 'title', alignment: 'center', margin: [0, 5, 0, 5] },

            {
                columns: [
                    { text: '', width: '*' },
                    { text: 'CARD NO. ', bold: true, width: 'auto', fontSize: 10 },
                    { text: formData.creditCardNo || '_______________________', width: 120, fontSize: 10, decoration: formData.creditCardNo ? 'underline' : undefined },
                    { text: '', width: '*' }
                ],
                margin: [0, 0, 0, 15]
            },

            { text: 'REQUESTER STAFF / พนักงานผู้ขอใช้', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: -2, x2: 515, y2: -2, lineWidth: 1, lineColor: '#8E5A34' }] },

            getUnderlinedField('Full Name/ ชื่อ  :', normalizeThai(formData.fullName), 100),
            getUnderlinedField('Department / แผนก  :', normalizeThai(formData.department), 100),
            getTwoColumnUnderlinedField('Contact No. / เบอร์ติดต่อ  :', formData.contactNo, 100, 'E-Mail  :', formData.email, 40),

            { text: '', margin: [0, 5] },
            { 
                table: {
                    widths: ['*', '*'],
                    body: [
                        [
                            { text: 'Event ID / รหัสอีเว้นท์', style: 'sectionHeader', border: [false, false, false, true] },
                            { text: 'Account Code / รหัสบัญชี', style: 'sectionHeader', border: [false, false, false, true] }
                        ],
                        ...(formData.eventDetails && formData.eventDetails.length > 0 
                            ? formData.eventDetails.map(ed => [
                                { text: ed.eventId, style: 'value', margin: [0, 2] },
                                { text: ed.accountCode, style: 'value', margin: [0, 2] }
                            ])
                            : [[{ text: 'N/A', style: 'value' }, { text: 'N/A', style: 'value' }]]
                        )
                    ]
                },
                layout: 'lightHorizontalLines',
                margin: [0, 5, 0, 10]
            },

            { text: '', margin: [0, 5] },

            { text: 'REQUEST DETAILS / รายละเอียดการขอใช้', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: -2, x2: 515, y2: -2, lineWidth: 1, lineColor: '#8E5A34' }] },

            ...getMultiLineUnderlinedField('Objective / วัตถุประสงค์  :', normalizeThai(formData.objective), 120, 3),
            
            { text: '', margin: [0, 5] },
            { text: 'Promotional Channels / ช่องทางในการโฆษณา', style: 'labelSub', bold: true },
            { text: '*Choose your type of Promotional Channels', fontSize: 6.5, color: '#666666', margin: [0, 1, 0, 4] },

            {
                columns: [
                    [
                        getCheckbox("Facebook"),
                        getCheckbox("IG"),
                        getCheckbox("Tiktok")
                    ],
                    [
                        getCheckbox("Youtube"),
                        getCheckbox("Line"),
                        getCheckbox("WeChat")
                    ],
                    [
                        getCheckbox("Google"),
                        checkboxOther("Other", otherMedia)
                    ]
                ],
                margin: [5, 0, 0, 10]
            },

            {
                table: {
                    widths: [150, '*'],
                    body: [[
                        { text: 'Booking Date / วันที่สั่งซื้อโฆษณา  :', style: 'label', border: [false, false, false, false] },
                        { text: fmtDate(formData.bookingDate), style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]]
                },
                margin: [0, 3, 0, 3]
            },

            { text: 'Effective Date / วันที่โฆษณาเริ่มมีผล', style: 'label', bold: true, margin: [0, 5, 0, 2] },

            {
                table: {
                    widths: [90, '*', 90, '*'],
                    body: [[
                        { text: 'Start Date / วันเริ่ม  :', style: 'label', border: [false, false, false, false] },
                        { text: fmtDate(formData.startDate), style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] },
                        { text: 'End Date / วันสิ้นสุด  :', style: 'label', border: [false, false, false, false] },
                        { text: fmtDate(formData.endDate), style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]]
                },
                margin: [0, 3, 0, 3]
            },

            {
                table: {
                    widths: [110, 160],
                    body: [[
                        { text: 'Amount / จำนวนเงิน  :', style: 'label', border: [false, false, false, false] },
                        { text: formData.amount ? `${parseFloat(String(formData.amount)).toLocaleString()} THB` : "", style: 'value', bold: true, border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]]
                },
                margin: [0, 5, 0, 5]
            },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#8E5A34' }] },
            { text: 'REQUESTER SIGNATURE / ลงชื่อผู้ขอใช้', style: 'sectionHeader', margin: [0, 8, 0, 8] },

            {
                table: {
                    widths: ['auto', '*', 'auto', '*'],
                    body: [[
                        { text: 'Signature  :', style: 'label', border: [false, false, false, false] },
                        { text: '', style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] },
                        { text: 'Date  :', style: 'label', border: [false, false, false, false], margin: [15, 0, 0, 0] },
                        { text: '', style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]]
                },
                margin: [0, 10, 0, 20]
            },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#8E5A34' }] },
            { text: 'AUTHORIZER / ลงชื่อผู้อนุมัติ', style: 'sectionHeader', margin: [0, 8, 0, 8] },

            {
                table: {
                    widths: ['auto', '*', 'auto', '*'],
                    body: [[
                        { text: 'Signature  :', style: 'label', border: [false, false, false, false] },
                        { text: '', style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] },
                        { text: 'Date  :', style: 'label', border: [false, false, false, false], margin: [15, 0, 0, 0] },
                        { text: '', style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]]
                },
                margin: [0, 10, 0, 20]
            },

            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#8E5A34' }] },
            { text: 'FA  DEPARTMENT USE ONLY', style: 'sectionHeader', margin: [0, 8, 0, 8] },

            {
                table: {
                    widths: ['auto', '*', 'auto', '*'],
                    body: [[
                        { text: 'Verified By / ตรวจสอบโดย  :', style: 'label', border: [false, false, false, false] },
                        { text: '', style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] },
                        { text: 'Date  :', style: 'label', border: [false, false, false, false], margin: [15, 0, 0, 0] },
                        { text: '', style: 'value', border: [false, false, false, true], borderColor: ['', '', '', '#6d4c41'] }
                    ]]
                },
                margin: [0, 10, 0, 10]
            }
        ],
        images: {
            logo: IMPACT_LOGO_BASE64
        },
        styles: {
            title: { fontSize: 11, bold: true },
            sectionHeader: { fontSize: 9.5, bold: true, color: '#8E5A34', margin: [0, 5, 0, 1] },
            label: { fontSize: 8.5, color: '#333333' },
            labelSub: { fontSize: 8.5, color: '#333333', margin: [0, 2, 0, 1] },
            value: { fontSize: 8.5, color: '#000000' }
        },
        defaultStyle: { font: 'Sarabun' }
    };

    const pdfDocGenerator = pdfMake.createPdf(docDefinition);
    return new Promise((resolve, reject) => {
        pdfDocGenerator.getBuffer((buffer: Uint8Array) => {
            if (buffer) resolve(buffer);
            else reject(new Error("PDF generation failed"));
        });
    });
}
