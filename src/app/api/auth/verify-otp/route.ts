import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { createSessionToken, getSessionCookieName } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

        // Find valid OTP
        const { data: otpRecord } = await supabase
            .from("otp_codes")
            .select("*")
            .eq("email", email.toLowerCase())
            .eq("code", code)
            .eq("used", false)
            .gte("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!otpRecord) {
            return NextResponse.json({ error: "Invalid or expired code. Please request a new one." }, { status: 401 });
        }

        // Mark OTP as used
        await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);

        // Mark profile as verified
        await supabase
            .from("profiles")
            .update({ email_verified: true })
            .eq("email", email.toLowerCase());

        // Get profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", email.toLowerCase())
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        // Create session token
        const token = createSessionToken({
            id: profile.id,
            email: profile.email,
            role: profile.role,
            name: profile.name,
            department: profile.department,
        });

        const response = NextResponse.json({
            success: true,
            user: {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                department: profile.department,
            },
        });

        response.cookies.set(getSessionCookieName(), token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60,
        });

        return response;
    } catch (error: any) {
        console.error("OTP verification error:", error);
        return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
    }
}
