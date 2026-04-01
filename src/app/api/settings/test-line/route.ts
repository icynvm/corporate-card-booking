import { NextRequest, NextResponse } from "next/server";
import { sendLineNotification } from "@/lib/line";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";

export const dynamic = "force-dynamic";

function getSession(req: NextRequest) {
    const token = req.cookies.get(getSessionCookieName())?.value;
    if (!token) return null;
    return parseSessionToken(token);
}

export async function POST(req: NextRequest) {
    try {
        const session = getSession(req);
        if (!session || session.role !== "admin") {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const result = await sendLineNotification("✅ LINE Notification System is active! This is a test message from your Card Booking System.");

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
