import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

const ALL_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "ACTIVE", "COMPLETED", "CANCELLED"];

// PUT: Update request status
export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = getSession(req);
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const supabase = createServerSupabase();
        const body = await req.json();
        const { status, notes } = body;
        const requestId = params.id;

        if (!status || !ALL_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${ALL_STATUSES.join(", ")}` },
                { status: 400 }
            );
        }

        // Get current request
        const { data: currentRequest, error: fetchError } = await supabase
            .from("requests")
            .select("*")
            .eq("id", requestId)
            .single();

        if (fetchError || !currentRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const oldStatus = currentRequest.status;

        // Prevent changes to cancelled requests
        if (oldStatus === "CANCELLED") {
            return NextResponse.json({ error: "Cancelled requests cannot be modified" }, { status: 400 });
        }

        // Role-based restrictions: user & manager can only CANCEL
        if (session.role !== "admin") {
            if (status !== "CANCELLED") {
                return NextResponse.json(
                    { error: "Only admin can change status. You can only cancel requests." },
                    { status: 403 }
                );
            }
            // Users can only cancel their own or DRAFT/PENDING_APPROVAL
            if (!["DRAFT", "PENDING_APPROVAL"].includes(oldStatus)) {
                return NextResponse.json(
                    { error: "You can only cancel Draft or Pending Approval requests" },
                    { status: 400 }
                );
            }
        }

        // Update status
        const updateData: Record<string, unknown> = { status };
        if (notes !== undefined) {
            updateData.approval_notes = notes;
        }

        const { data, error } = await supabase
            .from("requests")
            .update(updateData)
            .eq("id", requestId)
            .select()
            .single();

        if (error) throw new Error(`Failed to update status: ${error.message}`);

        // Audit log
        let action = "STATUS_CHANGE";
        if (status === "APPROVED") action = "APPROVE";
        else if (status === "REJECTED") action = "REJECT";
        else if (status === "CANCELLED") action = "CANCEL";

        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: requestId,
            action,
            user_id: session.pid,
            user_name: session.email || "System",
            changes: { old_status: oldStatus, new_status: status, notes: notes || "" },
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to update request status:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update status" },
            { status: 500 }
        );
    }
}

// Keep PATCH as alias for backward compatibility
export async function PATCH(
    req: NextRequest,
    context: { params: { id: string } }
) {
    return PUT(req, context);
}
