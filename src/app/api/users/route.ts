import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET: Fetch all users (profiles)
export async function GET(req: NextRequest) {
    try {
        // Only allow admins to fetch all users
        const auth = await requireSession(req, { roles: ["admin"] });
        if ("response" in auth) return auth.response;

        const supabase = createServerSupabase();
        
        const { data, error } = await supabase
            .from("profiles")
            .select("id, name, email, department, role, email_verified, created_at")
            .order("created_at", { ascending: false });

        if (error) throw error;
        
        return NextResponse.json(data || []);
    } catch (error) {
        console.error("Failed to fetch users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}
