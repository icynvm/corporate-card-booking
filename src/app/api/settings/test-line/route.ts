import { NextRequest, NextResponse } from "next/server";
import { sendLineNotification } from "@/lib/line";
import { requireSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const auth = await requireSession(req, { roles: ["admin"] });
        if ("response" in auth) return auth.response;
        const { session } = auth;

        const result = await sendLineNotification("✅ LINE Notification System is active! This is a test message from your Card Booking System.");

        if (!result.success) {
            console.error("LINE test failed:", result.error);
            return NextResponse.json({ error: "LINE test message failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("settings/test-line/route.ts error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
