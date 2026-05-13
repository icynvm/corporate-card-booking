import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

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
        const session = getSession(req);
        const body = await req.json();
        const supabase = createServerSupabase();

        let userId = body.userId || session?.pid;
        if (!userId) {
            // Find or create the dev profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", "dev@company.com")
                .maybeSingle();

            if (profile) {
                userId = profile.id;
            } else {
                const { data: newProfile, error: createError } = await supabase
                    .from("profiles")
                    .insert({
                        name: "Developer Admin",
                        email: "dev@company.com",
                        department: "Development",
                        role: "admin"
                    })
                    .select("id")
                    .single();

                if (createError) throw new Error(`Failed to create dev profile: ${createError.message}`);
                userId = newProfile.id;
            }
        }

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
            user_name: session?.name || session?.email || "Developer Admin",
            changes: { project_name: body.projectName },
        });

        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create project:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create project" },
            { status: 500 }
        );
    }
export async function PATCH(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session || (session.role !== "admin" && session.role !== "manager")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session || (session.role !== "admin" && session.role !== "manager")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
