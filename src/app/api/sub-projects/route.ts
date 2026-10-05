import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const auth = await requireSession(request);
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from("sub_projects")
            .select("name");

        if (error) {
            console.error("sub-projects error:", error);
            return NextResponse.json({ error: "Internal server error" }, { status: 500 });
        }

        // Filter uniques in memory
        const names = Array.from(new Set((data || []).map(d => d.name).filter(Boolean)));
        return NextResponse.json({ names });
    } catch (err) {
        console.error("sub-projects/route.ts error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
