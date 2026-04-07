import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { verifyPassword, createSessionToken, getSessionCookieName } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabase();
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Get profile
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", email.toLowerCase())
            .maybeSingle();

        if (!profile) {
            return NextResponse.json({ error: "No account found with this email." }, { status: 404 });
        }

        if (!profile.email_verified) {
            return NextResponse.json({ error: "Please verify your email first. Check your inbox for the OTP code." }, { status: 403 });
        }

        // Verify password
        const valid = await verifyPassword(password, profile.password_hash);
        if (!valid) {
            return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
        }

        // Create session
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
            maxAge: 3 * 24 * 60 * 60,
        });

        return response;
    } catch (error: any) {
        console.error("Login error:", error);
        return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
    }
}
