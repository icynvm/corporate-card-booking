import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from("sub_projects")
            .select("*")
            .eq("request_id", params.id)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Fetch sub-projects error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ subProjects: data || [] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

export async function PUSH(
    request: Request,
    { params }: { params: { id: string } }
) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { names, totalAmount } = await request.json();

        if (!Array.isArray(names) || names.length === 0) {
            return NextResponse.json({ error: "Names array is required and must not be empty" }, { status: 400 });
        }

        if (typeof totalAmount !== "number") {
            return NextResponse.json({ error: "Total amount is required and must be a number" }, { status: 400 });
        }

        const supabase = getServiceSupabase();

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
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ subProjects: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getServiceSupabase();

        const { error } = await supabase
            .from("sub_projects")
            .delete()
            .eq("request_id", params.id);

        if (error) {
            console.error("Delete sub-projects error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
}
