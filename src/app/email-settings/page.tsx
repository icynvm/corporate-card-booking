"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function EmailSettingsPage() {
    const [emailTo, setEmailTo] = useState("");
    const [emailFrom, setEmailFrom] = useState("");
    const [resendKey, setResendKey] = useState("");
    const [lineChannelId, setLineChannelId] = useState("");
    const [lineChannelSecret, setLineChannelSecret] = useState("");
    const [lineAccessToken, setLineAccessToken] = useState("");
    const [lineDestinationId, setLineDestinationId] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingLine, setTestingLine] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    setEmailTo(data.managerEmail || "");
                    setEmailFrom(data.senderEmail || "");
                    setResendKey(data.resendApiKey || "");
                    setLineChannelId(data.lineChannelId || "");
                    setLineChannelSecret(data.lineChannelSecret || "");
                    setLineAccessToken(data.lineAccessToken || "");
                    setLineDestinationId(data.lineDestinationId || "");
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            // Save Manager Email
            const res1 = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "MANAGER_EMAIL", value: emailTo }),
            });

            // Save Sender Email
            const res2 = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "SENDER_EMAIL", value: emailFrom }),
            });

            // Save Resend API Key (only if not masked and changed)
            const res3 = resendKey.includes("...")
                ? { ok: true }
                : await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: "RESEND_API_KEY", value: resendKey }),
                });

            // Save LINE Settings
            await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "LINE_CHANNEL_ID", value: lineChannelId }),
            });

            if (!lineChannelSecret.includes("...")) {
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: "LINE_CHANNEL_SECRET", value: lineChannelSecret }),
                });
            }

            if (!lineAccessToken.includes("...")) {
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key: "LINE_ACCESS_TOKEN", value: lineAccessToken }),
                });
            }

            const resLineDest = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "LINE_DESTINATION_ID", value: lineDestinationId }),
            });

            if (res1.ok && res2.ok && res3.ok && resLineDest.ok) {
                setMessage({ text: "All settings saved successfully!", type: "success" });
            } else {
                setMessage({ text: "Failed to save some settings", type: "error" });
            }
        } catch {
            setMessage({ text: "Failed to connect to server", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const handleTestLine = async () => {
        setTestingLine(true);
        setMessage(null);
        try {
            const res = await fetch("/api/settings/test-line", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                setMessage({ text: "Test LINE message sent! Check your group.", type: "success" });
            } else {
                setMessage({ text: `LINE Test Failed: ${data.error}`, type: "error" });
            }
        } catch {
            setMessage({ text: "Failed to connect to test endpoint", type: "error" });
        } finally {
            setTestingLine(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    Notification <span className="gradient-text">Settings</span>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Configure Email (Resend) and LINE Messaging for request alerts.
                </p>
            </div>

            <GlassCard>
                {loading ? (
                    <div className="text-center py-8">
                        <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Loading settings...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        {message && (
                            <div className={`px-4 py-3 rounded-xl text-sm border ${message.type === "success"
                                ? "bg-green-50 border-green-200 text-green-700"
                                : "bg-red-50 border-red-200 text-red-600"
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div>
                            <label className="label-text flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                                To (Manager Email)
                            </label>
                            <input
                                type="text"
                                value={emailTo}
                                onChange={(e) => setEmailTo(e.target.value)}
                                className="input-field"
                                placeholder="manager@company.com (separate multiple with commas)"
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                                The primary recipient email(s) for request notifications. Separate multiple with commas.
                            </p>
                        </div>

                        <div>
                            <label className="label-text flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 2L11 13" />
                                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                                </svg>
                                From (Sender Email)
                            </label>
                            <input
                                type="text"
                                value={emailFrom}
                                onChange={(e) => setEmailFrom(e.target.value)}
                                className="input-field"
                                placeholder="Corporate Card <noreply@yourdomain.com>"
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                                The email address used to send notifications and OTPs. This <strong>must</strong> use a domain verified on your Resend account.
                            </p>
                            <p className="text-[10px] text-brand-400 mt-0.5">
                                Leave blank to use testing address: Card Booking System &lt;support@booking.kie-ra.online&gt;
                            </p>
                        </div>

                        <div>
                            <label className="label-text flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                Resend API Key
                            </label>
                            <input
                                type="password"
                                value={resendKey}
                                onChange={(e) => setResendKey(e.target.value)}
                                className="input-field"
                                placeholder="re_xxxxxxxxxxxxxxxxxxxxxx"
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                                Optional. If provided, this will override the system environment variable. Key is masked for security.
                            </p>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-[#06C755] flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                                        <path d="M24 10.304c0-5.691-5.383-10.304-12-10.304s-12 4.613-12 10.304c0 5.1 4.273 9.387 10.035 10.154.391.083.923.258 1.058.592.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.541 6.916-4.085 9.448-6.992 1.894-2.146 2.534-4.043 2.534-6.539z" />
                                    </svg>
                                </span>
                                LINE Notifications
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="label-text">Channel ID</label>
                                    <input
                                        type="text"
                                        value={lineChannelId}
                                        onChange={(e) => setLineChannelId(e.target.value)}
                                        className="input-field"
                                        placeholder="200xxxxxxx"
                                    />
                                </div>

                                <div>
                                    <label className="label-text">Channel Secret</label>
                                    <input
                                        type="password"
                                        value={lineChannelSecret}
                                        onChange={(e) => setLineChannelSecret(e.target.value)}
                                        className="input-field"
                                        placeholder=".............."
                                    />
                                </div>

                                <div>
                                    <label className="label-text">Channel Access Token (Long-lived)</label>
                                    <textarea
                                        value={lineAccessToken}
                                        onChange={(e) => setLineAccessToken(e.target.value)}
                                        className="input-field min-h-[100px] py-3"
                                        placeholder="LzOfNMkAnYms..."
                                    />
                                </div>

                                <div>
                                    <label className="label-text">Destination ID (User or Group ID)</label>
                                    <input
                                        type="text"
                                        value={lineDestinationId}
                                        onChange={(e) => setLineDestinationId(e.target.value)}
                                        className="input-field"
                                        placeholder="Uxxxxxxxx or Gxxxxxxxx"
                                    />
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                                        Tip: To find the Group ID, add the bot to your group. We will log the ID when it receives a message.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save All Settings"}
                            </button>

                            <button
                                type="button"
                                onClick={handleTestLine}
                                disabled={testingLine || !lineDestinationId}
                                className="btn-secondary flex-1 flex items-center justify-center gap-2 border-[#06C755] text-[#06C755] hover:bg-[#06C755]/5 disabled:opacity-50"
                            >
                                {testingLine ? "Testing..." : "Test LINE Message"}
                            </button>
                        </div>
                    </form>
                )}
            </GlassCard>
        </div>
    );
}

