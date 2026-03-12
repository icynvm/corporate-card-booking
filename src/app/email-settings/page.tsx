"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function EmailSettingsPage() {
    const [emailTo, setEmailTo] = useState("");
    const [emailFrom, setEmailFrom] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    setEmailTo(data.managerEmail || "");
                    setEmailFrom(data.senderEmail || "");
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

            if (res1.ok && res2.ok) {
                setMessage({ text: "Email settings saved successfully!", type: "success" });
            } else {
                setMessage({ text: "Failed to save some settings", type: "error" });
            }
        } catch {
            setMessage({ text: "Failed to connect to server", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    Email <span className="gradient-text">Settings</span>
                </h1>
                <p className="text-sm text-gray-500">
                    Configure the recipient and CC email addresses for request notifications sent to managers.
                </p>
            </div>

            <GlassCard>
                {loading ? (
                    <div className="text-center py-8">
                        <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-gray-400 text-sm">Loading settings...</p>
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
                            <p className="text-xs text-gray-400 mt-1">
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
                            <p className="text-xs text-gray-400 mt-1">
                                The email address used to send notifications and OTPs. This <strong>must</strong> use a domain verified on your Resend account.
                            </p>
                            <p className="text-[10px] text-brand-400 mt-0.5">
                                Leave blank to use testing address: Card Booking System &lt;onboarding@resend.dev&gt;
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Saving...
                                </>
                            ) : "Save Settings"}
                        </button>
                    </form>
                )}
            </GlassCard>
        </div>
    );
}
