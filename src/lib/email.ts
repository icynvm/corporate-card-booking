import { escapeHtml } from "@/lib/utils/string";

export async function sendOTPEmail(email: string, code: string, name?: string, fromEmail?: string, resendApiKey?: string) {
    const activeResendKey = resendApiKey || process.env.RESEND_API_KEY;
    
    if (!activeResendKey || activeResendKey.startsWith("re_xxxx") || activeResendKey === "re_dummy_key_for_build") {
                return { success: true, dev: true, code };
    }

    const from = fromEmail || process.env.SENDER_EMAIL;
    if (!from) {
        throw new Error("Sender email is not configured. Set SENDER_EMAIL (env or app settings).");
    }

    const { Resend } = await import("resend");
    const resend = new Resend(activeResendKey);

    const { data, error } = await resend.emails.send({
        from,
        to: email,
        subject: `Your verification code: ${code}`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #f8fafc; padding: 32px;">
                <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 32px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 20px;">Corporate Card Booking</h1>
                    <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Email Verification Code</p>
                </div>
                <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); text-align: center;">
                    ${name ? `<p style="color: #64748b; margin-bottom: 8px;">Hello, ${escapeHtml(name)}</p>` : ""}
                    <p style="color: #334155; font-size: 16px; margin-bottom: 24px;">Your verification code is:</p>
                    <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; display: inline-block; min-width: 200px;">
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${escapeHtml(code)}</span>
                    </div>
                    <p style="margin-top: 24px; font-size: 13px; color: #94a3b8;">This code expires in 10 minutes.</p>
                </div>
            </div>`,
    });

    if (error) {
        console.error("Resend OTP Error details:", {
            error,
            email,
            from,
        });
        throw new Error(error.message ? `OTP Email Error: ${error.message}` : "Failed to send verification email. Please check your admin configuration.");
    }

    return { success: true };
}
