import { NextRequest, NextResponse } from "next/server";
import { generateRequestPdf } from "@/lib/pdf-generator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.json();
        
        const reqId = formData.reqId || `REQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

        const pdfBytes = await generateRequestPdf(formData);

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="card-request-${reqId}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}
