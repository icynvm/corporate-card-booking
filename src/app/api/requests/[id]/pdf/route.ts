import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { IMPACT_LOGO_BASE64 } from "@/lib/logo-base64";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = req.cookies.get(getSessionCookieName())?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const session = parseSessionToken(token);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();

        const { data: request, error: fetchError } = await supabase
            .from("requests")
            .select("*, profiles(*), projects(*)")
            .eq("id", params.id)
            .single();
            
        if (fetchError) {
            console.error("Fetch request error:", fetchError);
            return NextResponse.json({ error: "Failed to fetch request details", details: fetchError.message }, { status: 500 });
        }

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (session.role !== "admin" && request.user_id !== session.pid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Map database data to form data structure for the PDF generator
        const formData = {
            eventId: request.event_id,
            fullName: request.full_name || request.profiles?.name || "",
            department: request.profiles?.department || "",
            contactNo: request.contact_no || "",
            email: request.email || "",
            objective: request.objective || "",
            projectName: request.project_name || "",
            promotionalChannels: request.promotional_channels || [],
            bookingDate: request.booking_date,
            effectiveDate: request.effective_date,
            startDate: request.start_date,
            endDate: request.end_date,
            amount: request.amount,
        };

        const { generatePuppeteerPDF } = await import("@/lib/puppeteer-generator");
        const pdfBytes = await generatePuppeteerPDF(formData);

        return new NextResponse(pdfBytes, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="card-request-${formData.eventId}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json({ error: "Failed to generate PDF", details: error.message || String(error) }, { status: 500 });
    }
}
