import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";

const ALLOWED_SETTING_KEYS = [
    "MANAGER_EMAIL",
    "SENDER_EMAIL",
    "RESEND_API_KEY",
    "LINE_CHANNEL_ID",
    "LINE_CHANNEL_SECRET",
    "LINE_ACCESS_TOKEN",
    "LINE_DESTINATION_ID",
];

// GET: Fetch application settings
export async function GET(req: NextRequest) {
    try {
        const auth = await requireSession(req, { roles: ["admin"] });
        if ("response" in auth) return auth.response;
        const { session } = auth;

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
            managerEmail: settings.MANAGER_EMAIL || "",
            senderEmail: settings.SENDER_EMAIL || "",
            resendApiKey: settings.RESEND_API_KEY ? `${settings.RESEND_API_KEY.slice(0, 7)}...${settings.RESEND_API_KEY.slice(-4)}` : null,
            lineChannelId: settings.LINE_CHANNEL_ID || "",
            lineChannelSecret: settings.LINE_CHANNEL_SECRET ? `${settings.LINE_CHANNEL_SECRET.slice(0, 4)}...${settings.LINE_CHANNEL_SECRET.slice(-4)}` : null,
            lineAccessToken: settings.LINE_ACCESS_TOKEN ? `${settings.LINE_ACCESS_TOKEN.slice(0, 10)}...${settings.LINE_ACCESS_TOKEN.slice(-10)}` : null,
            lineDestinationId: settings.LINE_DESTINATION_ID || "",
        });
    } catch (error) {
        console.error("settings/route.ts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Update application setting
export async function POST(req: NextRequest) {
    try {
        const auth = await requireSession(req, { roles: ["admin"] });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const supabase = createServerSupabase();
        const { key, value } = await req.json();

        if (typeof key !== "string" || !ALLOWED_SETTING_KEYS.includes(key)) {
             return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
        }
        if (typeof value !== "string") {
             return NextResponse.json({ error: "Invalid setting value" }, { status: 400 });
        }

        const { error } = await supabase.from("app_settings").upsert(
            { key, value, description: "Updated via Admin Panel" }
        , { onConflict: "key" });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("settings/route.ts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
