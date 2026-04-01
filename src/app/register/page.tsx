"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardDescription, 
    CardContent, 
    CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-4 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                            <line x1="23" y1="11" x2="17" y2="11" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Create <span className="gradient-text">Account</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        {step === "form" ? "Register to start using the system" : "Verify your identity to proceed"}
                    </p>
                </div>

                <Card glass className="border-none">
                    {step === "form" ? (
                        <form onSubmit={handleRegister}>
                            <CardContent className="pt-6 space-y-4">
                                {error && (
                                    <div className="bg-red-50/50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs animate-slide-in">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Work Email</Label>
                                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Security Password</Label>
                                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" required minLength={6} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="team">Department / Team</Label>
                                    <Input id="team" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Technology" required />
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-6">
                                <Button type="submit" variant="brand" className="w-full h-12" disabled={loading}>
                                    {loading ? "Initializing..." : "Create Account & Verify"}
                                </Button>
                            </CardFooter>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP}>
                            <CardContent className="pt-6 space-y-5">
                                {error && (
                                    <div className="bg-red-50/50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs animate-slide-in">
                                        {error}
                                    </div>
                                )}

                                <div className="bg-indigo-50/50 border border-indigo-100 text-indigo-700 px-4 py-3 rounded-xl text-xs text-center">
                                    A 6-digit code was sent to <span className="font-bold">{email}</span>
                                </div>

                                {devCode && (
                                    <div className="bg-amber-50/50 border border-amber-100 text-amber-700 px-4 py-3 rounded-xl text-center">
                                        <p className="text-[10px] uppercase tracking-wider font-bold opacity-70 mb-1">Developer Mode</p>
                                        <span className="font-mono font-bold text-xl tracking-widest">{devCode}</span>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <Label className="text-center block">Verification Code</Label>
                                    <Input
                                        type="text"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                                        placeholder="000000"
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-4">
                                <Button type="submit" variant="brand" className="w-full h-12" disabled={loading || otpCode.length !== 6}>
                                    {loading ? "Verifying..." : "Confirm & Continue"}
                                </Button>
                                <Button variant="ghost" type="button" onClick={() => { setStep("form"); setError(""); setDevCode(""); }} className="w-full text-xs text-muted-foreground hover:text-gray-900">
                                    Back to registration
                                </Button>
                            </CardFooter>
                        </form>
                    )}

                    <div className="pb-8 px-8 text-center border-t border-gray-50/50 pt-6">
                        <p className="text-xs text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="text-brand-600 font-semibold hover:underline">Sign In</Link>
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    );
}

