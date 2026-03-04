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
        const body = await req.json();
        const supabase = createServerSupabase();

        let userId = body.userId;
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
                        role: "FA"
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
                description: body.description || "",
                created_by: userId,
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
            user_name: "Developer Admin",
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
}
