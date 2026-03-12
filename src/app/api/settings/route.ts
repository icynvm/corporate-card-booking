import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

// GET: Fetch application settings
export async function GET(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from("app_settings")
            .select("key, value");

        if (error) throw error;

        const settings: Record<string, string> = {};
        (data || []).forEach((row: any) => {
            settings[row.key] = row.value;
        });

        return NextResponse.json({
            managerEmail: settings.MANAGER_EMAIL || "manager@company.com",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Update application setting
export async function POST(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const supabase = createServerSupabase();
        const { key, value } = await req.json();

        if (!key) {
             return NextResponse.json({ error: "Key is required" }, { status: 400 });
        }

        const { error } = await supabase.from("app_settings").upsert(
            { key, value, description: "Updated via Admin Panel" }
        , { onConflict: "key" });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
