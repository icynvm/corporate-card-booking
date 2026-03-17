import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

// Helper to get session from cookie
function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = getSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requestId = params.id;
        if (!requestId) {
            return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
        }

        const supabase = createServerSupabase();

        // 1. Delete associated data first if not handled by CASCADE
        // (Audit logs are usually kept, but payments and receipts might need cleanup)
        
        // Delete payments
        await supabase.from("request_payments").delete().eq("request_id", requestId);
        
        // Delete the request itself
        const { error: deleteError } = await supabase
            .from("requests")
            .delete()
            .eq("id", requestId);

        if (deleteError) throw deleteError;

        // Log the deletion
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: requestId,
            action: "DELETE",
            user_name: session.email || "Admin",
            changes: { info: "Request deleted by admin" },
        });

        return NextResponse.json({ success: true, message: "Request deleted successfully" });
    } catch (error: any) {
        console.error("Failed to delete request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete request" },
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = getSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requestId = params.id;
        if (!requestId) {
            return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
        }

        const { objective, project_name, amount, contact_no, email, billing_type, start_date, end_date } = await req.json();

        const supabase = createServerSupabase();

        const updatePayload: any = {};
        if (objective !== undefined) updatePayload.objective = objective;
        if (project_name !== undefined) updatePayload.project_name = project_name;
        if (amount !== undefined) updatePayload.amount = typeof amount === "string" ? parseFloat(amount) : amount;
        if (contact_no !== undefined) updatePayload.contact_no = contact_no;
        if (email !== undefined) updatePayload.email = email;
        if (billing_type !== undefined) updatePayload.billing_type = billing_type;
        if (start_date !== undefined) updatePayload.start_date = start_date;
        if (end_date !== undefined) updatePayload.end_date = end_date;

        const { error: updateError } = await supabase
            .from("requests")
            .update(updatePayload)
            .eq("id", requestId);

        if (updateError) throw updateError;

        // Log the update
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: requestId,
            action: "UPDATE",
            user_name: session.email || "User",
            changes: updatePayload,
        });

        return NextResponse.json({ success: true, message: "Request updated successfully" });
    } catch (error: any) {
        console.error("Failed to update request:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update request" },
            { status: 500 }
        );
    }
}
