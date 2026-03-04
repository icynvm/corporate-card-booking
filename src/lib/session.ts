const SESSION_COOKIE = "cc_session";
const SESSION_SECRET = process.env.APPROVAL_SECRET || "dev-session-secret-key-2024";

export function createSessionToken(profile: {
    id: string;
    email: string;
    role: string;
    name: string;
    department: string;
}): string {
    const payload = {
        pid: profile.id,
        email: profile.email,
        role: profile.role,
        name: profile.name,
        department: profile.department,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
        sig: SESSION_SECRET.slice(0, 8),
    };
    return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function parseSessionToken(token: string): {
    pid: string;
    email: string;
    role: string;
    name: string;
    department: string;
} | null {
    try {
        const payload = JSON.parse(Buffer.from(token, "base64url").toString());
        if (payload.sig !== SESSION_SECRET.slice(0, 8)) return null;
        if (payload.exp < Date.now()) return null;
        return {
            pid: payload.pid,
            email: payload.email,
            role: payload.role,
            name: payload.name,
            department: payload.department,
        };
    } catch {
        return null;
    }
}

export function getSessionCookieName() {
    return SESSION_COOKIE;
}

export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Password hashing using Web Crypto (no extra dependencies)
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + SESSION_SECRET);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await hashPassword(password);
    return computed === hash;
}

export async function sendOTPEmail(email: string, code: string, name?: string) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey || resendKey.startsWith("re_xxxx") || resendKey === "re_dummy_key_for_build") {
        console.log(`[DEV] OTP for ${email}: ${code}`);
        return { success: true, dev: true, code };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);

    await resend.emails.send({
        from: "Card Booking System <onboarding@resend.dev>",
        to: email,
        subject: `Your verification code: ${code}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f8fafc; padding: 32px;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 32px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">Corporate Card Booking</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Email Verification Code</p>
                </div>
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); text-align: center;">
                    ${name ? `<p style="color: #64748b; margin-bottom: 8px;">Hello, ${name}</p>` : ""}
                    <p style="color: #334155; font-size: 16px; margin-bottom: 24px;">Your verification code is:</p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; display: inline-block; min-width: 200px;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${code}</span>
                    </div>
                    <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">This code expires in 10 minutes.</p>
                </div>
            </div>`,
    });

    return { success: true };
}
