import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { generateOTP, sendOTPEmail } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { name, email, department } = await req.json();

        if (!name || !email || !department) {
            return NextResponse.json({ error: "Name, email, and department are required" }, { status: 400 });
        }

        // Check if email already exists
        const { data: existing } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email.toLowerCase())
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: "An account with this email already exists. Please login instead." }, { status: 409 });
        }

        // Create profile
        const { data: profile, error: createError } = await supabase
            .from("profiles")
            .insert({
                name,
                email: email.toLowerCase(),
                department,
                role: "USER",
            })
            .select()
            .single();

        if (createError) throw new Error(`Failed to create profile: ${createError.message}`);

        // Generate and store OTP
        const code = generateOTP();
        await supabase.from("otp_codes").insert({
            email: email.toLowerCase(),
            code,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

        // Send OTP via Resend
        const result = await sendOTPEmail(email.toLowerCase(), code, name);

        return NextResponse.json({
            success: true,
            message: "Account created. Check your email for the verification code.",
            profileId: profile.id,
            ...(result.dev ? { devCode: code } : {}),
        });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
    }
}
