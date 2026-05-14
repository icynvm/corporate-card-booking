import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { parseSessionToken, getSessionCookieName } from "@/lib/session";
import { exchangeCodeForToken, getLongLivedToken } from "@/lib/facebook";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=${error}`);
    }

    if (!code) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=no_code`);
    }

    try {
        // 1. Get current session
        const token = req.cookies.get(getSessionCookieName())?.value;
        const session = token ? parseSessionToken(token) : null;
        
        if (!session) {
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
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

        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?success=facebook_connected`);
    } catch (err: any) {
        console.error("Facebook Callback Error:", err);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=${encodeURIComponent(err.message)}`);
    }
}
