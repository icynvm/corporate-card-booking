import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession, isPrivileged } from "@/lib/auth";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { IMPACT_LOGO_BASE64 } from "@/lib/logo-base64";

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await requireSession(req, { freshRole: true });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();

        const { data: request, error: fetchError } = await supabase
            .from("requests")
            .select("*, profiles(name, department), projects(*)")
            .eq("id", params.id)
            .single();
            
        if (fetchError) {
            console.error("Fetch request error:", fetchError);
            if (fetchError.code === "PGRST116") {
                return NextResponse.json({ error: "Request not found" }, { status: 404 });
            }
            return NextResponse.json({ error: "Failed to fetch request details" }, { status: 500 });
        }

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (!isPrivileged(session) && request.user_id !== session.pid) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Map database data to form data structure for the PDF generator
        const formData = {
            reqId: request.req_id || request.event_id || "",
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

        const { generateRequestPdf } = await import("@/lib/pdf-generator");
        const pdfBytes = await generateRequestPdf(formData);

        return new NextResponse(Buffer.from(pdfBytes), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="card-request-${String(formData.reqId).replace(/[^a-z0-9._-]/gi, "_")}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
    }
}
