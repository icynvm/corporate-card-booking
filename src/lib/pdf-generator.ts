import pdfMake from "./pdfmake-fonts";
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

const normalizeThai = (text: string = "") => {
    if (!text) return "";
    return text
        .normalize("NFC")
        // Swap Consonant + Vowel + Tone to Consonant + Tone + Vowel
        // Includes า (\u0E32) to prevent advance floating stalls
        .replace(/([ิีึืุูา])([\u0E48-\u0E4D])/g, "$2$1")
        .replace(/\u0E33\u0E32/g, "\u0E33");
};

export async function generateRequestPdf(formData: RequestPdfData): Promise<Uint8Array> {
    const selectedChannels = Array.isArray(formData.promotionalChannels) 
        ? formData.promotionalChannels.map((c: any) => typeof c === "string" ? c : c?.channel).filter(Boolean)
        : [];

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

    const getUnderlinedField = (label: string, value: string, labelWidth: number = 100) => {
        return {
            table: {
                widths: [labelWidth, '*'],
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
                widths: [width1, '*', width2, '*'],
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

    const checkboxOther = (label: string, otherValue: string) => {
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
                { text: label + ' : ', fontSize: 8.5 },
                { text: normalizeThai(otherValue) || "__________________________", fontSize: 8.5, decoration: otherValue ? 'underline' : undefined }
            ],
            margin: [0, 3, 0, 3]
        };
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
                    { text: '_______________________', width: 120, fontSize: 10 }
                ],
                margin: [0, 0, 0, 15]
            },

            { text: 'REQUESTER STAFF / พนักงานผู้ขอใช้', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: -2, x2: 515, y2: -2, lineWidth: 1, lineColor: '#8E5A34' }] },
            
            getUnderlinedField('Full Name/ ชื่อ  :', normalizeThai(formData.fullName), 100),
            getUnderlinedField('Department / แผนก  :', normalizeThai(formData.department), 100),
            getTwoColumnUnderlinedField('Contact No. / เบอร์ติดต่อ  :', formData.contactNo, 100, 'E-Mail  :', formData.email, 40),

            { text: '', margin: [0, 10] },

            { text: 'REQUEST DETAILS / รายละเอียดการขอใช้', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: -2, x2: 515, y2: -2, lineWidth: 1, lineColor: '#8E5A34' }] },

            getUnderlinedField('Objective / วัตถุประสงค์  :', normalizeThai(formData.objective), 120),

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
                        checkboxOther("Other", "")
                    ]
                ],
                margin: [5, 0, 0, 10]
            },

            {
                table: {
                    widths: [140, '*'],
                    body: [[
                        { text: 'Booking Date / วันที่สั่งซื้อโฆษณา  :', style: 'label', border: [false,false,false,false] },
                        { text: fmtDate(formData.bookingDate), style: 'value', border: [false,false,false,true], borderColor: ['','','','#6d4c41'] }
                    ]]
                },
                margin: [0, 3, 0, 3]
            },

            {
                table: {
                    widths: [140, '*'],
                    body: [[
                        { text: 'Effective Date / วันที่โฆษณาเริ่มมีผล  :', style: 'label', border: [false,false,false,false] },
                        { text: fmtDate(formData.effectiveDate), style: 'value', border: [false,false,false,true], borderColor: ['','','','#6d4c41'] }
                    ]]
                },
                margin: [0, 3, 0, 3]
            },

            {
                table: {
                    widths: [90, 140, 90, '*'],
                    body: [[
                        { text: 'Start Date / วันเริ่ม  :', style: 'label', border: [false,false,false,false] },
                        { text: fmtDate(formData.startDate), style: 'value', border: [false,false,false,true], borderColor: ['','','','#6d4c41'] },
                        { text: 'End Date / วันสิ้นสุด  :', style: 'label', border: [false,false,false,false] },
                        { text: fmtDate(formData.endDate), style: 'value', border: [false,false,false,true], borderColor: ['','','','#6d4c41'] }
                    ]]
                },
                margin: [0, 3, 0, 3]
            },

            {
                table: {
                    widths: [90, '*'],
                    body: [[
                        { text: 'Amount / จำนวนเงิน  :', style: 'label', border: [false,false,false,false] },
                        { text: formData.amount ? `${parseFloat(String(formData.amount)).toLocaleString()} THB` : "", style: 'value', bold: true, border: [false,false,false,true], borderColor: ['','','','#6d4c41'] }
                    ]]
                },
                margin: [0, 5, 0, 5]
            },

            { text: '', margin: [0, 15] },

            { text: 'REQUESTER SIGNATURE / ลงชื่อผู้ขอใช้', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: -2, x2: 515, y2: -2, lineWidth: 0.8, lineColor: '#8E5A34' }] },
            { text: '', margin: [0, 10] },
            {
                columns: [
                    { text: 'Signature  : _______________________', width: 250, fontSize: 8.5 },
                    { text: 'Date  : _______________________', width: '*', fontSize: 8.5 }
                ]
            },

            { text: '', margin: [0, 15] },

            { text: 'AUTHORIZER / ลงชื่อผู้อนุมัติ', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: -2, x2: 515, y2: -2, lineWidth: 0.8, lineColor: '#8E5A34' }] },
            { text: '', margin: [0, 10] },
            {
                columns: [
                    { text: 'Signature  : _______________________', width: 250, fontSize: 8.5 },
                    { text: 'Date  : _______________________', width: '*', fontSize: 8.5 }
                ]
            },

            { text: '', margin: [0, 15] },

            { text: 'FA  DEPARTMENT USE ONLY', bold: true, fontSize: 10, margin: [0, 10, 0, 6] },
            {
                columns: [
                    { text: 'Verified By / ตรวจสอบโดย  : _______________________', width: 250, fontSize: 8.5 },
                    { text: 'Date  : _______________________', width: '*', fontSize: 8.5 }
                ]
            }
        ],
        styles: {
            title: { fontSize: 13, bold: true },
            sectionHeader: { fontSize: 9.5, bold: true, color: '#8E5A34' },
            label: { fontSize: 8.5, color: '#333333' },
            labelSub: { fontSize: 8.5, color: '#333333' },
            value: { fontSize: 8.5, color: '#111111' }
        },
        defaultStyle: {
            font: 'Sarabun'
        },
        images: {
            logo: `data:image/png;base64,${IMPACT_LOGO_BASE64.split(",")[1]}`
        }
    };

    return new Promise((resolve, reject) => {
        try {
            const pdfDocGenerator = pdfMake.createPdf(docDefinition);
            pdfDocGenerator.getBuffer((buffer: any) => {
                resolve(new Uint8Array(buffer));
            });
        } catch (error) {
            reject(error);
        }
    });
}
