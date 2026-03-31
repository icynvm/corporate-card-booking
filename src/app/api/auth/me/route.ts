import { NextRequest, NextResponse } from "next/server";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

export async function GET(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const session = parseSessionToken(token);
    if (!session) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
        user: {
            id: session.pid,
            email: session.email,
            role: session.role,
            name: session.name,
            department: session.department,
        },
    });
}
