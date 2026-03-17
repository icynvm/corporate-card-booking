import { NextRequest, NextResponse } from "next/server";
import { generatePuppeteerPDF } from "@/lib/puppeteer-generator";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.json();
        
        const eventId = formData.eventId || `REQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;

        // Generate PDF using Puppeteer for perfect Thai shaping support
        const pdfBytes = await generatePuppeteerPDF(formData);

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="card-request-${eventId}.pdf"`,
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
