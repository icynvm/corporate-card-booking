import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { SARABUN_REGULAR_BASE64 } from "@/lib/fonts-base64";

export async function GET(req: NextRequest) {
    try {
        const pdfDoc = await PDFDocument.create();
        pdfDoc.registerFontkit(fontkit);

        const fontBytes = Buffer.from(SARABUN_REGULAR_BASE64, "base64");
        const customFont = await pdfDoc.embedFont(fontBytes, { subset: false });

        const page = pdfDoc.addPage([600, 400]);

        // 1. Standard Order: เ + พ + ื + ่ + อ
        const text1 = "\u0E40\u0E1E\u0E37\u0E48\u0E2D"; // เพื่อ
        
        // 2. Swapped Order: เ + พ + ่ + ื + อ
        const text2 = "\u0E40\u0E1E\u0E48\u0E37\u0E2D"; 

        page.drawText(`Standard: ${text1}`, {
            x: 50,
            y: 300,
            size: 24,
            font: customFont,
            color: rgb(0, 0, 0),
        });

        page.drawText(`Swapped: ${text2}`, {
            x: 50,
            y: 250,
            size: 24,
            font: customFont,
            color: rgb(0, 0, 0),
        });
        
        const text3 = "เพื่อใช้งาน";
        const text4 = "เพื่อใช้งาน".replace(/\u0E37\u0E48/g, "\u0E48\u0E37"); // Replace ื่ with ่ื
        
        page.drawText(`Standard Phrase: ${text3}`, {
            x: 50,
            y: 200,
            size: 24,
            font: customFont,
            color: rgb(0, 0, 0),
        });

        page.drawText(`Swapped Phrase: ${text4}`, {
            x: 50,
            y: 150,
            size: 24,
            font: customFont,
            color: rgb(0, 0, 0),
        });

        const pdfBytes = await pdfDoc.save();

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=thai-test.pdf",
            },
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
