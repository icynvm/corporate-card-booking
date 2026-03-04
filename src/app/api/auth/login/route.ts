import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { generateOTP, sendOTPEmail } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Check if profile exists
        const { data: profile } = await supabase
            .from("profiles")
            .select("id, name")
            .eq("email", email.toLowerCase())
            .maybeSingle();

        if (!profile) {
            return NextResponse.json({ error: "No account found with this email. Please register first." }, { status: 404 });
        }

        // Generate and store OTP
        const code = generateOTP();
        await supabase.from("otp_codes").insert({
            email: email.toLowerCase(),
            code,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

        // Send OTP via Resend
        const result = await sendOTPEmail(email.toLowerCase(), code, profile.name);

        return NextResponse.json({
            success: true,
            message: "Verification code sent to your email.",
            ...(result.dev ? { devCode: code } : {}),
        });
    } catch (error: any) {
        console.error("Login OTP error:", error);
        return NextResponse.json({ error: error.message || "Failed to send code" }, { status: 500 });
    }
}
