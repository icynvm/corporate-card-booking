import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireSession } from "@/lib/auth";
import { getFacebookLoginUrl } from "@/lib/facebook";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const auth = await requireSession(req);
    if ("response" in auth) return auth.response;

    try {
        const state = randomBytes(24).toString("base64url");
        const url = getFacebookLoginUrl(state);

        const res = NextResponse.redirect(url);
        res.cookies.set("fb_oauth_state", state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 600,
            path: "/api/auth/facebook",
        });
        return res;
    } catch (error) {
        console.error("Facebook login error:", error);
        return NextResponse.json({ error: "Facebook login unavailable" }, { status: 500 });
    }
}
