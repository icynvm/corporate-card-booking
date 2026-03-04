import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");
        const action = searchParams.get("action");

        if (!token || !action) {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=Invalid+link", req.url)
            );
        }

        if (action !== "approve" && action !== "reject") {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=Invalid+action", req.url)
            );
        }

        // Find request by approval token
        const { data: request, error } = await supabase
            .from("requests")
            .select("*, profiles(*)")
            .eq("approval_token", token)
            .single();

        if (error || !request) {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=Request+not+found+or+link+expired", req.url)
            );
        }

        // Check if token has expired
        if (request.approval_token_expiry && new Date() > new Date(request.approval_token_expiry)) {
            return NextResponse.redirect(
                new URL("/approval-result?status=error&message=This+approval+link+has+expired", req.url)
            );
        }

        // Check if already processed
        if (request.status !== "PENDING") {
            return NextResponse.redirect(
                new URL(
                    `/approval-result?status=info&message=This+request+has+already+been+${request.status.toLowerCase()}&eventId=${request.event_id}`,
                    req.url
                )
            );
        }

        // Update request status
        const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

        await supabase
            .from("requests")
            .update({
                status: newStatus,
                approval_token: null,
                approval_token_expiry: null,
            })
            .eq("id", request.id);

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: request.id,
            action: action === "approve" ? "APPROVE" : "REJECT",
            user_name: "Manager (via email link)",
            changes: { event_id: request.event_id, new_status: newStatus },
        });

        return NextResponse.redirect(
            new URL(
                `/approval-result?status=success&action=${action}&eventId=${request.event_id}&requester=${encodeURIComponent(request.profiles?.name || "")}&amount=${request.amount}`,
                req.url
            )
        );
    } catch (error) {
        console.error("Approval error:", error);
        return NextResponse.redirect(
            new URL("/approval-result?status=error&message=An+unexpected+error+occurred", req.url)
        );
    }
}
