import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

export async function GET(request: NextRequest) {
    try {
        const session = getSession(request);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from("sub_projects")
            .select("name");

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Filter uniques in memory
        const names = Array.from(new Set((data || []).map(d => d.name).filter(Boolean)));
        return NextResponse.json({ names });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
