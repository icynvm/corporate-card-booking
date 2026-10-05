import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServerSupabase } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { exchangeCodeForToken, getLongLivedToken } from "@/lib/facebook";

export const dynamic = 'force-dynamic';

function redirectTo(req: NextRequest, path: string) {
    const res = NextResponse.redirect(new URL(path, req.nextUrl.origin));
    // State is single-use: always clear it
    res.cookies.set("fb_oauth_state", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/api/auth/facebook",
    });
    return res;
}

function statesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false;
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");
    const cookieState = req.cookies.get("fb_oauth_state")?.value;

    if (!statesMatch(state, cookieState)) {
        return redirectTo(req, "/profile?error=invalid_state");
    }

    if (error) {
        return redirectTo(req, "/profile?error=facebook_denied");
    }

    if (!code) {
        return redirectTo(req, "/profile?error=no_code");
    }

    try {
        // 1. Get current session
        const session = await getSession(req);
        
        if (!session) {
            return redirectTo(req, "/login");
        }

        // 2. Exchange code for short-lived token
        const authData = await exchangeCodeForToken(code);
        
        // 3. Exchange for long-lived token (60 days)
        const longLivedData = await getLongLivedToken(authData.access_token);
        
        // 4. Update user profile
        const supabase = createServerSupabase();
        const { error: updateError } = await supabase
            .from("profiles")
            .update({
                fb_access_token: longLivedData.access_token,
                fb_user_id: authData.user_id // Note: might need separate call to /me if user_id is not in authData
            })
            .eq("id", session.pid);

        if (updateError) throw updateError;

        return redirectTo(req, "/profile?success=facebook_connected");
    } catch (err) {
        console.error("Facebook Callback Error:", err);
        return redirectTo(req, "/profile?error=facebook_failed");
    }
}
