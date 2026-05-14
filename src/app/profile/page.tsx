"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";

export default function ProfilePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({ type: "", message: "" });

    useEffect(() => {
        fetchUser();
        
        const error = searchParams.get("error");
        const success = searchParams.get("success");
        if (error) setStatus({ type: "error", message: `Connection failed: ${error}` });
        if (success) setStatus({ type: "success", message: "Facebook account connected successfully!" });
    }, [searchParams]);

    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            } else {
                router.push("/login");
            }
        } catch {
            router.push("/login");
        } finally {
            setLoading(false);
        }
    };

    const handleConnectFacebook = () => {
        window.location.href = "/api/auth/facebook/login";
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading profile...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    My <span className="gradient-text">Profile</span>
                </h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your account settings and connected services.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="md:col-span-1 flex flex-col items-center text-center p-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-xl">
                        {user?.name?.[0].toUpperCase()}
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{user?.name}</h2>
                    <p className="text-sm text-gray-500">{user?.department}</p>
                    <div className="mt-4 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold uppercase tracking-wider">
                        {user?.role}
                    </div>
                </GlassCard>

                <div className="md:col-span-2 space-y-6">
                    <GlassCard>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Account Details</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Email Address</label>
                                <p className="text-gray-700 dark:text-gray-300 font-medium">{user?.email}</p>
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Department</label>
                                <p className="text-gray-700 dark:text-gray-300 font-medium">{user?.department}</p>
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Connected Services</h3>
                        
                        {status.message && (
                            <div className={`p-3 rounded-lg text-sm mb-4 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {status.message}
                            </div>
                        )}

                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-[#1877F2] flex items-center justify-center text-white shadow-lg shadow-[#1877F2]/20">
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Facebook Marketing</h4>
                                    <p className="text-xs text-gray-500">Sync campaigns and manage ad budgets.</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleConnectFacebook}
                                className="px-4 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold rounded-lg transition-all shadow-md shadow-[#1877F2]/20"
                            >
                                Connect
                            </button>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
