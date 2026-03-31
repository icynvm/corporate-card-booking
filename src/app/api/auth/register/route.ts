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
            .select("id, email_verified")
            .eq("email", email.toLowerCase())
            .maybeSingle();

        if (existing && existing.email_verified) {
            return NextResponse.json({ error: "An account with this email already exists and is verified. Please login instead." }, { status: 409 });
        }

        // Hash password
        const password_hash = await hashPassword(password);

        let profileId: string;

        if (existing && !existing.email_verified) {
            // Update unverified existing profile
            const { data: updated, error: updateError } = await supabase
                .from("profiles")
                .update({
                    name,
                    password_hash,
                    department,
                })
                .eq("id", existing.id)
                .select()
                .single();
            
            if (updateError) throw new Error(`Failed to update profile: ${updateError.message}`);
            profileId = updated.id;
        } else {
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
            profileId = profile.id;
        }

        // Generate and store OTP
        const code = generateOTP();
        await supabase.from("otp_codes").insert({
            email: email.toLowerCase(),
            code,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

        // Send OTP via Resend
        const { data: emailSettings } = await supabase
            .from("app_settings")
            .select("key, value")
            .in("key", ["SENDER_EMAIL", "RESEND_API_KEY"]);
        
        const settingsMap = (emailSettings || []).reduce((acc: any, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});

        console.log("Registration API DEBUG:", {
            emailSettings,
            SENDER_EMAIL_from_db: settingsMap.SENDER_EMAIL,
            RESEND_KEY_exists: !!settingsMap.RESEND_API_KEY
        });
        
        const result = await sendOTPEmail(
            email.toLowerCase(), 
            code, 
            name, 
            settingsMap.SENDER_EMAIL,
            settingsMap.RESEND_API_KEY
        );

        return NextResponse.json({
            success: true,
            message: "Account created. Check your email for the verification code.",
            profileId: profileId,
            ...(result.dev ? { devCode: code } : {}),
        });
    } catch (error: any) {
        console.error("Full Registration Error:", {
            message: error.message,
            stack: error.stack,
            error
        });
        return NextResponse.json({ error: error.message || "Registration failed" }, { status: 500 });
    }
}
