import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession, isPrivileged } from "@/lib/auth";

type Access = { ok: true; supabase: ReturnType<typeof createServerSupabase> } | { ok: false; response: NextResponse };

// Loads the parent request and checks access.
// mode "read": owner or admin/manager. mode "write": admin, or owner while DRAFT/PENDING_APPROVAL.
async function authorize(req: NextRequest, requestId: string, mode: "read" | "write"): Promise<Access> {
    const auth = await requireSession(req, { freshRole: true });
    if ("response" in auth) return { ok: false, response: auth.response };
    const { session } = auth;

    const supabase = createServerSupabase();
    const { data: parent, error } = await supabase
        .from("requests")
        .select("id, user_id, status")
        .eq("id", requestId)
        .maybeSingle();

    if (error) {
        console.error("Sub-projects parent lookup error:", error);
        return { ok: false, response: NextResponse.json({ error: "Internal server error" }, { status: 500 }) };
    }
    if (!parent) {
        return { ok: false, response: NextResponse.json({ error: "Request not found" }, { status: 404 }) };
    }

    const isOwner = parent.user_id === session.pid;
    const allowed =
        mode === "read"
            ? isOwner || isPrivileged(session)
            : session.role === "admin" || (isOwner && ["DRAFT", "PENDING_APPROVAL"].includes(parent.status));

    if (!allowed) {
        return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { ok: true, supabase };
}

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const access = await authorize(request, params.id, "read");
        if (!access.ok) return access.response;

        const { data, error } = await access.supabase
            .from("sub_projects")
            .select("*")
            .eq("request_id", params.id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Fetch sub-projects error:", error);
            return NextResponse.json({ error: "Failed to fetch sub-projects" }, { status: 500 });
        }

        return NextResponse.json({ subProjects: data || [] });
    } catch (err: any) {
        console.error("Sub-projects GET failed:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const access = await authorize(request, params.id, "write");
        if (!access.ok) return access.response;
        const { supabase } = access;

        const { names, totalAmount } = await request.json();

        if (!Array.isArray(names) || names.length === 0) {
            return NextResponse.json({ error: "Names array is required and must not be empty" }, { status: 400 });
        }

        if (typeof totalAmount !== "number" || !Number.isFinite(totalAmount) || totalAmount < 0) {
            return NextResponse.json({ error: "Total amount is required and must be a non-negative number" }, { status: 400 });
        }

        // Calculate the divided amount per sub-project
        const count = names.length;
        const perProjectAmount = totalAmount / count;

        // Prepare the insert objects
        const insertData = names.map(name => ({
            request_id: params.id,
            name: name,
            amount: perProjectAmount
        }));

        // Delete existing sub-projects before creating new ones if they re-allocate
        await supabase
            .from("sub_projects")
            .delete()
            .eq("request_id", params.id);

        // Insert new sub-projects
        const { data, error } = await supabase
            .from("sub_projects")
            .insert(insertData)
            .select();

        if (error) {
            console.error("Insert sub-projects error:", error);
            return NextResponse.json({ error: "Failed to save sub-projects" }, { status: 500 });
        }

        return NextResponse.json({ subProjects: data });
    } catch (err: any) {
        console.error("Sub-projects POST failed:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const access = await authorize(request, params.id, "write");
        if (!access.ok) return access.response;

        const { error } = await access.supabase
            .from("sub_projects")
            .delete()
            .eq("request_id", params.id);

        if (error) {
            console.error("Delete sub-projects error:", error);
            return NextResponse.json({ error: "Failed to delete sub-projects" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Sub-projects DELETE failed:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
