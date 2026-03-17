import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";
import { sendLineNotification } from "@/lib/line";

// Helper to get session from cookie
function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

// GET: Fetch requests based on role
export async function GET(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const billingType = searchParams.get("billingType");

        let query = supabase
            .from("requests")
            .select("*, profiles(*), projects(*), receipts(*), request_payments(*)")
            .order("created_at", { ascending: false });

        // Role-based filtering: admin sees all, others see only their own
        if (session.role !== "admin") {
            query = query.eq("user_id", session.pid);
        }

        if (status) query = query.eq("status", status);
        if (billingType) query = query.eq("billing_type", billingType);

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error) {
        console.error("Failed to fetch requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch requests" },
            { status: 500 }
        );
    }
}

const cleanText = (text: string = "") =>
  text
    .normalize("NFC")
    .replace(/([\u0E48-\u0E4C])([\u0E31-\u0E3A])/g, "$2$1")
    .replace(/า([\u0E48-\u0E4C])/g, "$1า")
    .replace(/\u0E33\u0E32/g, "\u0E33");

// POST: Create a new request
export async function POST(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();
        const body = await req.json();

        // Clean Thai text combining mark order / typos
        if (body.projectName) body.projectName = cleanText(body.projectName);
        if (body.objective) body.objective = cleanText(body.objective);
        if (body.contactNo) body.contactNo = cleanText(body.contactNo);
        if (body.email) body.email = cleanText(body.email);
        if (body.fullName) body.fullName = cleanText(body.fullName);

        // Generate Event ID: REQ-YYYY-XXXX (More robust max-based logic)
        const year = new Date().getFullYear();
        const { data: existingIds } = await supabase
            .from("requests")
            .select("event_id")
            .like("event_id", `REQ-${year}%`);

        let nextNumber = 1;
        if (existingIds && existingIds.length > 0) {
            const numbers = existingIds.map(req => {
                const parts = req.event_id.split("-");
                return parseInt(parts[parts.length - 1]) || 0;
            });
            nextNumber = Math.max(...numbers) + 1;
        }

        const eventId = `REQ-${year}-${String(nextNumber).padStart(4, "0")}`;
        const userId = session.pid;

        // Automatic Project Matching/Creation
        let projectId = body.projectId;
        if (!projectId && body.projectName) {
            // Check if project already exists with this name (case-insensitive-ish)
            const { data: existingProject } = await supabase
                .from("projects")
                .select("id")
                .ilike("project_name", body.projectName)
                .maybeSingle();

            if (existingProject) {
                projectId = existingProject.id;
            } else {
                // Create new project
                const { data: newProject, error: projectError } = await supabase
                    .from("projects")
                    .insert({
                        project_name: body.projectName,
                        created_by: userId,
                        total_budget: 0,
                        remaining_budget: 0
                    })
                    .select()
                    .single();

                if (!projectError && newProject) {
                    projectId = newProject.id;
                }
            }
        }

        // Create the request
        const { data: request, error: insertError } = await supabase
            .from("requests")
            .insert({
                event_id: eventId,
                user_id: userId,
                full_name: cleanText(body.fullName || ""),
                project_id: projectId || null,
                project_name: cleanText(body.projectName || ""),
                amount: parseFloat(body.amount),
                objective: cleanText(body.objective || ""),
                contact_no: cleanText(body.contactNo || ""),
                email: body.email || "dev@company.com",
                billing_type: body.billingType,
                start_date: body.startDate,
                end_date: body.endDate,
                booking_date: body.bookingDate || null,
                effective_date: body.effectiveDate || null,
                promotional_channels: body.promotionalChannels || [],
                status: "PENDING_APPROVAL",
            })
            .select()
            .single();

        if (insertError) throw new Error(`Database insert failed: ${insertError.message}`);

        // If YEARLY_MONTHLY, create monthly payment entries
        if (body.billingType === "YEARLY_MONTHLY" && request) {
            try {
                const startDate = new Date(body.startDate);
                const endDate = new Date(body.endDate);
                const totalAmount = parseFloat(body.amount);
                const months: string[] = [];
                const current = new Date(startDate);
                while (current <= endDate) {
                    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
                    current.setMonth(current.getMonth() + 1);
                }
                const monthlyAmount = totalAmount / (months.length || 1);

                const payments = months.map((my) => ({
                    request_id: request.id,
                    month_year: my,
                    amount_due: Math.round(monthlyAmount * 100) / 100,
                    amount_paid: 0,
                    status: "PENDING",
                }));

                await supabase.from("request_payments").insert(payments);
            } catch (paymentError) {
                console.error("Failed to create payments:", paymentError);
                // Don't fail the whole request for payments
            }
        }

        // Generate and upload PDF to Supabase Bucket "Request Form"
        if (request) {
            try {
                const { generateRequestPdf } = await import("@/lib/pdf-generator");
                const pdfBytes = await generateRequestPdf({
                    eventId: eventId,
                    fullName: body.fullName,
                    department: body.department,
                    contactNo: body.contactNo,
                    email: body.email,
                    objective: body.objective,
                    projectName: body.projectName,
                    promotionalChannels: body.promotionalChannels,
                    bookingDate: body.bookingDate,
                    effectiveDate: body.effectiveDate,
                    startDate: body.startDate,
                    endDate: body.endDate,
                    amount: body.amount
                });

                const now = new Date();
                const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
                const fileName = `${dateStr}_${request.id}.pdf`;

                await supabase.storage
                    .from("Request Form")
                    .upload(fileName, Buffer.from(pdfBytes), {
                        contentType: "application/pdf",
                        upsert: true
                    });

                // Update request with invoice_url or similar if needed? User didn't ask, just asked to keep it.
            } catch (pdfError) {
                console.error("PDF Backup Failed:", pdfError);
            }
        }

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: request?.id || eventId,
            action: "CREATE",
            user_id: userId,
            user_name: body.fullName || "Developer Admin",
            changes: { event_id: eventId, amount: body.amount, project_name: body.projectName, billing_type: body.billingType },
        });

        // LINE Notification
        try {
            const lineMessage = `📣 มีคำขอการใช้บัตรเครดิตเข้ามาใหม่!

👤 ผู้ขอ: ${body.fullName}
🏢 ทีม: ${body.department}
📂 โปรเจกต์: ${body.projectName}
💰 วงเงิน: ${parseFloat(body.amount).toLocaleString()} บาท
📝 เหตุผล: ${body.objective}

ฝากพิจารณาให้หน่อยนะ 🙏`;
            await sendLineNotification(lineMessage);
        } catch (lineError) {
            console.error("Failed to send LINE notification:", lineError);
        }

        return NextResponse.json(request, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create request" },
            { status: 500 }
        );
    }
}
