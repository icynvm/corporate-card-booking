import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

// GET: Search/list projects
export async function GET(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        let query = supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });

        if (search) {
            query = query.ilike("project_name", `%${search}%`);
        }

        const { data, error } = await query.limit(20);

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error) {
        console.error("Failed to fetch projects:", error);
        return NextResponse.json([], { status: 500 });
    }
}

// POST: Create a new project
export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const body = await req.json();

        const { data: project, error } = await supabase
            .from("projects")
            .insert({
                project_name: body.projectName,
                total_budget: parseFloat(body.totalBudget || "0"),
                remaining_budget: parseFloat(body.totalBudget || "0"),
                created_by: body.userId || null,
            })
            .select()
            .single();

        if (error) throw error;

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "PROJECT",
            entity_id: project?.id || "",
            action: "CREATE",
            user_id: body.userId || null,
            user_name: body.userName || "",
            changes: { project_name: body.projectName, total_budget: body.totalBudget },
        });

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error("Failed to create project:", error);
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        );
    }
}
