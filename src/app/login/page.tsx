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

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
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
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                        <img 
                            src="https://wxxaazwykroptrnuaotk.supabase.co/storage/v1/object/public/Image/logo-impactorganizer-square.png" 
                            alt="Logo" 
                            className="w-full h-full object-contain rounded-xl shadow-md"
                        />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                        Corporate Card <span className="gradient-text">Booking</span>
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">Sign in to your corporate account</p>
                </div>

                <Card glass className="border-none">
                    <form onSubmit={handleLogin}>
                        <CardContent className="pt-6 space-y-6">
                            {error && (
                                <div className="bg-red-50/50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-xs animate-slide-in">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@company.com"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your security password"
                                    required
                                />
                            </div>
                        </CardContent>

                        <CardFooter className="flex flex-col gap-6">
                            <Button 
                                type="submit" 
                                variant="brand" 
                                className="w-full h-12" 
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Authorizing...
                                    </>
                                ) : "Sign In"}
                            </Button>
                            
                            <p className="text-xs text-center text-muted-foreground">
                                Don&apos;t have an account?{" "}
                                <Link 
                                    href="/register" 
                                    className="text-brand-600 hover:text-brand-700 font-semibold underline-offset-4 hover:underline transition-all"
                                >
                                    Register Account
                                </Link>
                            </p>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}

