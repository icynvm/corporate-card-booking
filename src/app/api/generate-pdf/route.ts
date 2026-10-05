import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { generateRequestPdf } from "@/lib/pdf-generator";

export async function POST(req: NextRequest) {
    try {
        const auth = await requireSession(req);
        if ("response" in auth) return auth.response;

        const formData = await req.json();
        
        const reqId = formData.reqId || `REQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

        const pdfBytes = await generateRequestPdf(formData);

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="card-request-${String(reqId).replace(/[^a-z0-9._-]/gi, "_")}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate PDF" },
            { status: 500 }
        );
    }
}
