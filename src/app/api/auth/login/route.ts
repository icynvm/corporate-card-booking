import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { createSessionToken, getSessionCookieName, sessionCookieOptions } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/password";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const WINDOW_SECONDS = 15 * 60;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body?.password === "string" ? body.password : "";

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        const ipLimit = await rateLimit(`login:ip:${clientIp(req)}`, 20, WINDOW_SECONDS);
        const emailLimit = await rateLimit(`login:email:${email}`, 10, WINDOW_SECONDS);
        if (!ipLimit.allowed || !emailLimit.allowed) {
            const retryAfter = Math.max(ipLimit.retryAfter ?? 0, emailLimit.retryAfter ?? 0) || WINDOW_SECONDS;
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429, headers: { "Retry-After": String(retryAfter) } }
            );
        }

        const supabase = createServerSupabase();

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("email", email)
            .maybeSingle();

        const invalid = () =>
            NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

        if (!profile || !profile.password_hash) {
            return invalid();
        }

        const { valid, needsRehash } = await verifyPassword(password, profile.password_hash);
        if (!valid) {
            return invalid();
        }

        if (!profile.email_verified) {
            return NextResponse.json({ error: "Please verify your email first. Check your inbox for the OTP code." }, { status: 403 });
        }

        if (needsRehash) {
            try {
                const password_hash = await hashPassword(password);
                await supabase.from("profiles").update({ password_hash }).eq("id", profile.id);
            } catch (rehashError) {
                console.error("Password rehash failed:", rehashError);
            }
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
        console.error("Login error:", error);
        return NextResponse.json({ error: "Login failed. Please try again." }, { status: 500 });
    }
}
