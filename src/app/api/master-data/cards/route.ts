import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireSession(req);
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from("credit_card_master")
            .select("*")
            .order("card_name", { ascending: true });

        if (error) throw error;
        return NextResponse.json(data || []);
    } catch (error) {
        console.error("master-data/cards/route.ts error:", error);
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
            .from("credit_card_master")
            .insert({
                card_no: body.cardNo,
                card_name: body.cardName,
                bank: body.bank,
                description: body.description
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error("master-data/cards/route.ts error:", error);
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

        const updateData: any = {};
        if (updates.cardNo !== undefined) updateData.card_no = updates.cardNo;
        if (updates.cardName !== undefined) updateData.card_name = updates.cardName;
        if (updates.bank !== undefined) updateData.bank = updates.bank;
        if (updates.description !== undefined) updateData.description = updates.description;

        const { data, error } = await supabase
            .from("credit_card_master")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error("master-data/cards/route.ts error:", error);
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
            .from("credit_card_master")
            .delete()
            .eq("id", id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("master-data/cards/route.ts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
