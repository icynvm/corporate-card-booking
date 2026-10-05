import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

// GET: legacy email links. Never changes state (email security scanners prefetch links);
// it only redirects to the confirmation page, where the manager must click a button.
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const action = searchParams.get("action");

    if (!token || (action !== "approve" && action !== "reject")) {
        return NextResponse.redirect(
            new URL("/approval-result?status=error&message=Invalid+link", req.url)
        );
    }

    return NextResponse.redirect(
        new URL(
            `/approval-result?token=${encodeURIComponent(token)}&action=${action}`,
            req.url
        )
    );
}

// POST: perform the approval. The one-time token is the credential (managers approve without logging in).
export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const body = await req.json().catch(() => null);
        const token = body?.token;
        const action = body?.action;

        if (typeof token !== "string" || !token || token.length > 200) {
            return NextResponse.json({ status: "error", message: "Invalid link" }, { status: 400 });
        }
        if (action !== "approve" && action !== "reject") {
            return NextResponse.json({ status: "error", message: "Invalid action" }, { status: 400 });
        }

        // Find request by approval token
        const { data: request, error } = await supabase
            .from("requests")
            .select("id, req_id, status, amount, approval_token_expiry, profiles(name)")
            .eq("approval_token", token)
            .maybeSingle();

        if (error) {
            console.error("Approval lookup error:", error);
            return NextResponse.json({ status: "error", message: "An unexpected error occurred" }, { status: 500 });
        }
        if (!request) {
            return NextResponse.json(
                { status: "error", message: "Request not found or link expired" },
                { status: 404 }
            );
        }

        // Check if token has expired
        if (!request.approval_token_expiry || new Date() > new Date(request.approval_token_expiry)) {
            return NextResponse.json(
                { status: "error", message: "This approval link has expired" },
                { status: 410 }
            );
        }

        // Check if already processed
        if (request.status !== "PENDING_APPROVAL") {
            return NextResponse.json({
                status: "info",
                message: `This request has already been ${String(request.status).toLowerCase().replace(/_/g, " ")}`,
                reqId: request.req_id,
            });
        }

        // Update request status (conditional to avoid double-processing)
        const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

        const { data: updated, error: updateError } = await supabase
            .from("requests")
            .update({
                status: newStatus,
                approval_token: null,
                approval_token_expiry: null,
            })
            .eq("id", request.id)
            .eq("status", "PENDING_APPROVAL")
            .select("id");

        if (updateError) {
            console.error("Approval update error:", updateError);
            return NextResponse.json({ status: "error", message: "An unexpected error occurred" }, { status: 500 });
        }
        if (!updated || updated.length === 0) {
            return NextResponse.json({
                status: "info",
                message: "This request has already been processed",
                reqId: request.req_id,
            });
        }

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "REQUEST",
            entity_id: request.id,
            action: action === "approve" ? "APPROVE" : "REJECT",
            user_name: "Manager (via email link)",
            changes: { req_id: request.req_id, old_status: request.status, new_status: newStatus },
        });

        const profile: any = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;

        return NextResponse.json({
            status: "success",
            action,
            reqId: request.req_id,
            requester: profile?.name || "",
            amount: request.amount,
        });
    } catch (error) {
        console.error("Approval error:", error);
        return NextResponse.json({ status: "error", message: "An unexpected error occurred" }, { status: 500 });
    }
}
