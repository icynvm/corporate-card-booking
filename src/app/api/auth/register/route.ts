import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { hashPassword, generateOTP, sendOTPEmail } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { name, email, password, department } = await req.json();

        if (!name || !email || !password || !department) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
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

        // Hash password
        const password_hash = await hashPassword(password);

        // Create profile (not yet verified)
        const { data: profile, error: createError } = await supabase
            .from("profiles")
            .insert({
                name,
                email: email.toLowerCase(),
                password_hash,
                department,
                role: "user",
                email_verified: false,
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
