import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

// PATCH: Update user role
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = getSession(req);
        // Only admins can change roles
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const newRole = body.role;

        if (!["admin", "user", "manager"].includes(newRole)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const supabase = createServerSupabase();

        // Update the profile role
        const { data, error } = await supabase
            .from("profiles")
            .update({ role: newRole })
            .eq("id", params.id)
            .select()
            .single();

        if (error) throw error;

        // Create an audit log for role change
        await supabase.from("audit_logs").insert({
            entity_type: "USER_ROLE",
            entity_id: params.id,
            action: "CHANGE_ROLE",
            user_id: session.pid,
            user_name: session.email || "Admin",
            changes: { new_role: newRole },
        });

        return NextResponse.json({ message: "Role updated successfully", user: data });
    } catch (error: any) {
        console.error("Failed to update role:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update role" },
            { status: 500 }
        );
    }
}
