import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

// GET: Fetch email settings
export async function GET(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const supabase = createServerSupabase();
        const { data } = await supabase
            .from("app_settings")
            .select("*")
            .in("setting_key", ["email_to", "email_cc"]);

        const settings: Record<string, string> = {};
        (data || []).forEach((row: any) => {
            settings[row.setting_key] = row.setting_value;
        });

        return NextResponse.json({
            email_to: settings.email_to || "",
            email_cc: settings.email_cc || "",
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update email settings
export async function PUT(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const supabase = createServerSupabase();
        const { email_to, email_cc } = await req.json();

        // Upsert email_to
        await supabase.from("app_settings").upsert(
            { setting_key: "email_to", setting_value: email_to || "" },
            { onConflict: "setting_key" }
        );

        // Upsert email_cc
        await supabase.from("app_settings").upsert(
            { setting_key: "email_cc", setting_value: email_cc || "" },
            { onConflict: "setting_key" }
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
