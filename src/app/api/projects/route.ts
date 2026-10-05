import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

// Escape LIKE/ILIKE wildcards in user input
function escapeLike(input: string): string {
    return input.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// GET: Search/list projects
export async function GET(req: NextRequest) {
    try {
        const auth = await requireSession(req);
        if ("response" in auth) return auth.response;

        const supabase = createServerSupabase();
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        let query = supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false });

        if (search) {
            query = query.ilike("project_name", `%${escapeLike(search)}%`);
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
        const auth = await requireSession(req);
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const body = await req.json();
        const supabase = createServerSupabase();

        if (typeof body.projectName !== "string" || !body.projectName.trim()) {
            return NextResponse.json({ error: "Project name is required" }, { status: 400 });
        }

        const userId = session.pid;

        const { data, error } = await supabase
            .from("projects")
            .insert({
                project_name: body.projectName,
            })
            .select()
            .single();

        if (error) throw error;

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "PROJECT",
            entity_id: data.id,
            action: "CREATE",
            user_id: userId,
            user_name: session.name || session.email,
            changes: { project_name: body.projectName },
        });

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create project:", error);
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireSession(req, { roles: ["admin", "manager"] });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const body = await req.json();
        const { id, projectName } = body;

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        const { data, error } = await supabase
            .from("projects")
            .update({ project_name: projectName })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "PROJECT",
            entity_id: id,
            action: "UPDATE",
            user_id: session.pid,
            user_name: session.name || session.email,
            changes: { project_name: projectName },
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("projects/route.ts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const auth = await requireSession(req, { roles: ["admin", "manager"] });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        const supabase = createServerSupabase();
        const { error } = await supabase
            .from("projects")
            .delete()
            .eq("id", id);

        if (error) throw error;

        // Audit log
        await supabase.from("audit_logs").insert({
            entity_type: "PROJECT",
            entity_id: id,
            action: "DELETE",
            user_id: session.pid,
            user_name: session.name || session.email,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("projects/route.ts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
