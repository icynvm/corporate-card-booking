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
    return (text || "")
        .normalize("NFC")
        .replace(/([\u0E48-\u0E4C])([\u0E31-\u0E3A])/g, "$2$1")
        .replace(/\u0E33\u0E32/g, "\u0E33")
        .replace(/\u0E37\u0E48/g, "\u0E48\u0E37");
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
                        { type: 'rect', x: 0, y: 1, w: 9, h: 9, lineWidth: 0.5, lineColor: '#AAAAAA' },
                        ...(isChecked ? [
                            { type: 'line', x1: 2, y1: 5, x2: 4, y2: 8, lineWidth: 1.2, lineColor: '#222222' },
                            { type: 'line', x1: 4, y1: 8, x2: 8, y2: 2, lineWidth: 1.2, lineColor: '#222222' }
                        ] : [])
                    ],
                    width: 15
                },
                { text: label, fontSize: 8.5 }
            ],
            margin: [0, 3, 0, 3]
        };
    };

    const docDefinition: any = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            {
                columns: [
                    { text: '', width: '*' },
                    {
                        image: 'logo',
                        width: 100,
                        alignment: 'right'
                    }
                ]
            },
            { text: 'CORPORATE EXECUTIVE CARD REQUEST FORM', style: 'title', alignment: 'center', margin: [0, 10, 0, 20] },
            
            {
                columns: [
                    { text: '', width: '*' },
                    { text: 'CARD NO. ', bold: true, width: 'auto', fontSize: 10 },
                    { text: '_______________________', width: 120, fontSize: 10 }
                ],
                margin: [0, 0, 0, 20]
            },

            { text: 'REQUESTER STAFF', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#8E5A34' }] },
            { text: '', margin: [0, 5] },
            
            {
                columns: [
                    { text: 'Full Name :', style: 'label', width: 80 },
                    { text: normalizeThai(formData.fullName), style: 'value' }
                ],
                margin: [0, 4, 0, 4]
            },
            { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },

            {
                columns: [
                    { text: 'Team :', style: 'label', width: 80 },
                    { text: normalizeThai(formData.department), style: 'value' }
                ],
                margin: [0, 4, 0, 4]
            },
            { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },

            {
                columns: [
                    { text: 'Contact No. :', style: 'label', width: 80 },
                    { text: formData.contactNo, style: 'value', width: 160 },
                    { text: 'E-Mail :', style: 'label', width: 50 },
                    { text: formData.email, style: 'value' }
                ],
                margin: [0, 4, 0, 4]
            },
            { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 240, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }, { type: 'line', x1: 290, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },

            { text: '', margin: [0, 15] },

            { text: 'REQUEST DETAILS', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#8E5A34' }] },
            { text: '', margin: [0, 5] },

            {
                columns: [
                    { text: 'Objective :', style: 'label', width: 80 },
                    { text: normalizeThai(formData.objective), style: 'value' }
                ],
                margin: [0, 4, 0, 4]
            },
            { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },

            { text: '', margin: [0, 5] },
            { text: 'Promotional Channels', style: 'labelSub', bold: true },
            { text: '*Choose your type of Promotional Channels', fontSize: 6.5, color: '#999999', margin: [0, 2, 0, 5] },

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
                        getCheckbox("Other")
                    ]
                ]
            },

            { text: '', margin: [0, 15] },

            {
                columns: [
                    { text: 'Booking Date :', style: 'label', width: 100 },
                    { text: fmtDate(formData.bookingDate), style: 'value' }
                ],
                margin: [0, 4, 0, 4]
            },
            { canvas: [{ type: 'line', x1: 100, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },

            {
                columns: [
                    { text: 'Effective Date :', style: 'label', width: 100 },
                    { text: fmtDate(formData.effectiveDate), style: 'value' }
                ],
                margin: [0, 4, 0, 4]
            },
            { canvas: [{ type: 'line', x1: 100, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },

            {
                columns: [
                    { text: 'Start Date :', style: 'label', width: 80 },
                    { text: fmtDate(formData.startDate), style: 'value', width: 120 },
                    { text: 'End Date :', style: 'label', width: 60 },
                    { text: fmtDate(formData.endDate), style: 'value' }
                ],
                margin: [0, 4, 0, 4]
            },
            { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 200, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }, { type: 'line', x1: 260, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#EEEEEE' }] },

            {
                columns: [
                    { text: 'Amount :', style: 'label', width: 80 },
                    { 
                        text: formData.amount ? `${parseFloat(String(formData.amount)).toLocaleString()} THB` : "", 
                        style: 'value', 
                        bold: true 
                    }
                ],
                margin: [0, 8, 0, 8]
            },
            { canvas: [{ type: 'line', x1: 80, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#DDDDDD' }] },

            { text: '', margin: [0, 20] },

            { text: 'REQUESTER SIGNATURE', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#8E5A34' }] },
            { text: '', margin: [0, 15] },
            {
                columns: [
                    { text: 'Signature  : _______________________', width: 250, fontSize: 8.5 },
                    { text: 'Date  : _______________________', width: '*', fontSize: 8.5 }
                ]
            },

            { text: '', margin: [0, 20] },

            { text: 'AUTHORIZER', style: 'sectionHeader' },
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#8E5A34' }] },
            { text: '', margin: [0, 15] },
            {
                columns: [
                    { text: 'Signature  : _______________________', width: 250, fontSize: 8.5 },
                    { text: 'Date  : _______________________', width: '*', fontSize: 8.5 }
                ]
            },

            { text: '', margin: [0, 20] },

            { text: 'FA  DEPARTMENT USE ONLY', bold: true, fontSize: 10, margin: [0, 10, 0, 10] },
            {
                columns: [
                    { text: 'Verified By : _______________________', width: 250, fontSize: 8.5 },
                    { text: 'Date  : _______________________', width: '*', fontSize: 8.5 }
                ]
            }
        ],
        styles: {
            title: { fontSize: 14, bold: true },
            sectionHeader: { fontSize: 10, bold: true, color: '#8E5A34' },
            label: { fontSize: 8.5, color: '#555555' },
            labelSub: { fontSize: 9, color: '#555555' },
            value: { fontSize: 9, color: '#222222' }
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
