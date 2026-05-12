import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName, hashPassword } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

// PATCH: Admin resets a user's password
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = getSession(req);
        // Only admins can reset passwords
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { password } = body;

        if (!password || typeof password !== "string") {
            return NextResponse.json({ error: "Password is required" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const supabase = createServerSupabase();

        // Hash the new password
        const password_hash = await hashPassword(password);

        // Update the profile
        const { data, error } = await supabase
            .from("profiles")
            .update({ password_hash })
            .eq("id", params.id)
            .select("id, name, email")
            .single();

        if (error) throw error;

        if (!data) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Create an audit log for password reset
        await supabase.from("audit_logs").insert({
            entity_type: "USER_PASSWORD",
            entity_id: params.id,
            action: "RESET_PASSWORD",
            user_id: session.pid,
            user_name: session.email || "Admin",
            changes: { target_user: data.email, reset_by: session.email },
        });

        return NextResponse.json({ message: "Password reset successfully", user: data });
    } catch (error: any) {
        console.error("Failed to reset password:", error);
        return NextResponse.json(
            { error: error.message || "Failed to reset password" },
            { status: 500 }
        );
    }
}
