import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const auth = await requireSession(req);
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from("event_master")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error("[Events GET Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = await requireSession(req);
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const body = await req.json();

        const { data, error } = await supabase
            .from("event_master")
            .insert({
                event_id: body.eventId,
                description: body.description || "Quick Added",
                is_active: true // Default to active
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error: any) {
        console.error("[Events POST Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = await requireSession(req, { roles: ["admin", "manager"] });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        // Build update object dynamically to avoid sending undefined values
        const updateData: any = {};
        if (updates.eventId !== undefined) updateData.event_id = updates.eventId;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

        const { data, error } = await supabase
            .from("event_master")
            .update(updateData)
            .eq("id", id)
            .select();

        if (error) throw error;
        return NextResponse.json(data?.[0] || null);
    } catch (error: any) {
        console.error("[Events PATCH Error]:", error);
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
            .from("event_master")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("[Events API Error]:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
