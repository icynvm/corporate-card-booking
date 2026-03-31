import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// GET: Fetch audit logs
export async function GET(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(req.url);
        const entityType = searchParams.get("entityType");
        const entityId = searchParams.get("entityId");

        let query = supabase
            .from("audit_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);

        if (entityType) query = query.eq("entity_type", entityType);
        if (entityId) query = query.eq("entity_id", entityId);

        const { data, error } = await query;

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error) {
        console.error("Failed to fetch audit logs:", error);
        return NextResponse.json([], { status: 500 });
    }
}
