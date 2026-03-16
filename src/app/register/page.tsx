"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();
    const [step, setStep] = useState<"form" | "otp">("form");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [department, setDepartment] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [devCode, setDevCode] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, department }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            if (data.devCode) setDevCode(data.devCode);
            setStep("otp");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: otpCode }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            router.push("/dashboard");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-4 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        Create <span className="gradient-text">Account</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {step === "form" ? "Register to start using the system" : "Enter the verification code sent to your email"}
                    </p>
                </div>

                <div className="glass-card !p-8">
                    {step === "form" ? (
                        <form onSubmit={handleRegister} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
                            )}

                            <div>
                                <label className="label-text">Full Name</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Enter your full name" required />
                            </div>

                            <div>
                                <label className="label-text">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@company.com" required />
                            </div>

                            <div>
                                <label className="label-text">Password</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="Min. 6 characters" required minLength={6} />
                            </div>

                            <div>
                                <label className="label-text">Team</label>
                                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="input-field" placeholder="e.g. Digital Marketing" required />
                            </div>

                            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Creating account...
                                    </>
                                ) : "Create Account & Verify Email"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl text-sm">
                                A 6-digit code was sent to <strong>{email}</strong>
                            </div>

                            {devCode && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
                                    <strong>Dev Mode:</strong> Your code is <span className="font-mono font-bold text-lg">{devCode}</span>
                                </div>
                            )}

                            <div>
                                <label className="label-text">Verification Code</label>
                                <input
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                    className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                                    placeholder="000000"
                                    maxLength={6}
                                    required
                                    autoFocus
                                />
                            </div>

                            <button type="submit" disabled={loading || otpCode.length !== 6} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                                {loading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Verifying...
                                    </>
                                ) : "Verify & Continue"}
                            </button>

                            <button type="button" onClick={() => { setStep("form"); setError(""); setDevCode(""); }} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                                Back to form
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-400">
                            Already have an account?{" "}
                            <a href="/login" className="text-brand-500 hover:text-brand-700 font-medium transition-colors">Sign In</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
