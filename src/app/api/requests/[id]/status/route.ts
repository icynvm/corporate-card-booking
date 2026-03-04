import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// PATCH: Update request status
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createServerSupabase();
        const body = await req.json();
        const { status, notes } = body;
        const requestId = params.id;

        if (!status || !["PENDING", "APPROVED", "REJECTED", "COMPLETED"].includes(status)) {
            return NextResponse.json(
                { error: "Invalid status. Must be PENDING, APPROVED, REJECTED, or COMPLETED" },
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
            return NextResponse.json(
                { error: "Request not found" },
                { status: 404 }
            );
        }

        const oldStatus = currentRequest.status;

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
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: requestId,
            action: status === "APPROVED" ? "APPROVE" : status === "REJECTED" ? "REJECT" : "STATUS_CHANGE",
            user_name: "Admin",
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
