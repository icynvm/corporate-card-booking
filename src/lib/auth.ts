// Node runtime helpers for API routes.
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName, type SessionPayload } from "@/lib/session";

export type Role = "admin" | "manager" | "user";

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

export async function requireSession(
    req: NextRequest,
    opts?: { roles?: Role[]; freshRole?: boolean }
): Promise<{ session: SessionPayload } | { response: NextResponse }> {
    const session = await getSession(req);
    if (!session) {
        return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    if (opts?.roles || opts?.freshRole) {
        const supabase = createServerSupabase();
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.pid)
            .maybeSingle();

        if (!profile) {
            return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
        }
        session.role = profile.role;

        if (opts.roles && !opts.roles.includes(profile.role as Role)) {
            return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
        }
    }

    return { session };
}

export function isPrivileged(session: { role: string }): boolean {
    return session.role === "admin" || session.role === "manager";
}

export { escapeHtml } from "@/lib/utils/string";
