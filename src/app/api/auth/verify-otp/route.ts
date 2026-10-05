import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { createSessionToken, getSessionCookieName, sessionCookieOptions } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MAX_ATTEMPTS = 5;

// Constant-time string comparison (length is not secret: OTPs are fixed-length)
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const code = typeof body?.code === "string" || typeof body?.code === "number" ? String(body.code).trim() : "";

        if (!email || !code) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

        const ipLimit = await rateLimit(`otp:ip:${clientIp(req)}`, 30, 15 * 60);
        if (!ipLimit.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter ?? 900) } }
            );
        }

        const supabase = createServerSupabase();

        // Latest unused, unexpired OTP for this email (not filtered by code)
        const { data: otpRecord } = await supabase
            .from("otp_codes")
            .select("*")
            .eq("email", email)
            .eq("used", false)
            .gte("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!otpRecord) {
            return NextResponse.json({ error: "Invalid or expired code. Please request a new one." }, { status: 401 });
        }

        if ((otpRecord.attempts ?? 0) >= MAX_ATTEMPTS) {
            await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);
            return NextResponse.json({ error: "Too many attempts, request a new code" }, { status: 429 });
        }

        if (!safeEqual(String(otpRecord.code), code)) {
            await supabase
                .from("otp_codes")
                .update({ attempts: (otpRecord.attempts ?? 0) + 1 })
                .eq("id", otpRecord.id);
            return NextResponse.json({ error: "Invalid or expired code. Please request a new one." }, { status: 401 });
        }

        // Mark OTP as used
        await supabase.from("otp_codes").update({ used: true }).eq("id", otpRecord.id);

        // Mark profile as verified
        await supabase
            .from("profiles")
            .update({ email_verified: true })
            .eq("email", email);

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", email)
            .single();

        if (!profile) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const token = await createSessionToken({
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

        response.cookies.set(getSessionCookieName(), token, sessionCookieOptions());

        return response;
    } catch (error) {
        console.error("OTP verification error:", error);
        return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
    }
}
