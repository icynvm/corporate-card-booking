import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { generateOTP } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { sendOTPEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();

        const ipLimit = await rateLimit(`register:ip:${clientIp(req)}`, 10, 60 * 60);
        if (!ipLimit.allowed) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(ipLimit.retryAfter ?? 3600) } }
            );
        }

        const body = await req.json();
        const { name, password, department } = body;
        const rawEmail = body.email;

        if (!name || !rawEmail || !password || !department) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        if (typeof name !== "string" || typeof rawEmail !== "string" || typeof password !== "string" || typeof department !== "string") {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const email = rawEmail.trim().toLowerCase();

        if (!EMAIL_RE.test(email) || email.length > 254) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        // Check if email already exists
        const { data: existing } = await supabase
            .from("profiles")
            .select("id, email_verified")
            .eq("email", email)
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
                    email: email,
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
        // Invalidate any previous unused codes for this email
        await supabase
            .from("otp_codes")
            .update({ used: true })
            .eq("email", email)
            .eq("used", false);
        await supabase.from("otp_codes").insert({
            email: email,
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

        const result = await sendOTPEmail(
            email, 
            code, 
            name, 
            settingsMap.SENDER_EMAIL,
            settingsMap.RESEND_API_KEY
        );

        return NextResponse.json({
            success: true,
            message: "Account created. Check your email for the verification code.",
            profileId: profileId,
            ...(result.dev && process.env.NODE_ENV !== "production" ? { devCode: code } : {}),
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
    }
}
