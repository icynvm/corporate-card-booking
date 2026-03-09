import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

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

// POST: Create a new request
export async function POST(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();
        const body = await req.json();

        // Generate Event ID: REQ-YYYY-XXXX
        const year = new Date().getFullYear();
        const { count } = await supabase
            .from("requests")
            .select("*", { count: "exact", head: true })
            .like("event_id", `REQ-${year}%`);

        const eventId = `REQ-${year}-${String((count || 0) + 1).padStart(4, "0")}`;
        const userId = session.pid;

        // Create the request
        const { data: request, error: insertError } = await supabase
            .from("requests")
            .insert({
                event_id: eventId,
                user_id: userId,
                project_id: body.projectId || null,
                project_name: body.projectName || "",
                amount: parseFloat(body.amount),
                objective: body.objective,
                contact_no: body.contactNo,
                email: body.email || "dev@company.com",
                billing_type: body.billingType,
                start_date: body.startDate,
                end_date: body.endDate,
                booking_date: body.bookingDate || null,
                effective_date: body.effectiveDate || null,
                promotional_channels: body.promotionalChannels || [],
                status: "DRAFT", // Note: The UI label for DRAFT is updated to 'Pending' via types.ts
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

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: request?.id || eventId,
            action: "CREATE",
            user_id: userId,
            user_name: body.fullName || "Developer Admin",
            changes: { event_id: eventId, amount: body.amount, project_name: body.projectName, billing_type: body.billingType },
        });

        return NextResponse.json(request, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create request" },
            { status: 500 }
        );
    }
}
