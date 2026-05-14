"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";

interface Campaign {
    id: string;
    name: string;
    status: string;
    objective: string;
    daily_budget?: string;
    lifetime_budget?: string;
}

export default function AdsManagerPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState({
        since: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        until: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchCampaigns();
    }, [dateRange]);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/facebook/campaigns?since=${dateRange.since}&until=${dateRange.until}`);
            const data = await res.json();
            
            if (!res.ok) {
                if (data.error === "Facebook not connected") {
                    setError("FB_NOT_CONNECTED");
                } else {
                    setError(data.error);
                }
            } else {
                setCampaigns(data);
                setError(null);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (campaignId: string, currentStatus: string) => {
        const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
        try {
            const res = await fetch("/api/facebook/campaigns", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ campaignId, status: newStatus }),
            });
            if (res.ok) {
                fetchCampaigns();
            }
        } catch (err) {
            console.error("Failed to toggle status", err);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading your campaigns...</div>;

    if (error === "FB_NOT_CONNECTED") {
        return (
            <div className="max-w-2xl mx-auto p-12 text-center">
                <GlassCard className="space-y-6 !p-12">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                        <svg className="w-10 h-10 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Facebook Not Connected</h1>
                    <p className="text-gray-500">Connect your Facebook account in your profile to manage your ads from here.</p>
                    <button 
                        onClick={() => window.location.href = "/profile"}
                        className="btn-primary w-full"
                    >
                        Go to Profile
                    </button>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                        Ads <span className="gradient-text">Manager</span>
                    </h1>
                    <p className="text-sm text-gray-500">Manage your Facebook campaigns directly from this portal.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-xl px-3 py-1.5 shadow-sm">
                        <input 
                            type="date" 
                            value={dateRange.since}
                            onChange={(e) => setDateRange(prev => ({ ...prev, since: e.target.value }))}
                            className="bg-transparent border-none text-xs text-gray-600 dark:text-gray-300 focus:ring-0"
                        />
                        <span className="text-gray-300 px-2">—</span>
                        <input 
                            type="date" 
                            value={dateRange.until}
                            onChange={(e) => setDateRange(prev => ({ ...prev, until: e.target.value }))}
                            className="bg-transparent border-none text-xs text-gray-600 dark:text-gray-300 focus:ring-0"
                        />
                    </div>
                    <button onClick={fetchCampaigns} className="btn-secondary flex items-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="!p-6 border-l-4 border-blue-500">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Active Campaigns</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                        {campaigns.filter(c => c.status === "ACTIVE").length}
                    </p>
                </GlassCard>
                <GlassCard className="!p-6 border-l-4 border-brand-500">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Campaigns</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{campaigns.length}</p>
                </GlassCard>
            </div>

            <GlassCard className="overflow-hidden !p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Campaign Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Objective</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Budget</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {campaigns.map((campaign) => (
                                <tr key={campaign.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{campaign.name}</p>
                                        <p className="text-[10px] text-gray-400 font-mono">{campaign.id}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${campaign.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                            {campaign.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {campaign.objective}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {campaign.daily_budget ? `${(parseInt(campaign.daily_budget) / 100).toLocaleString()} / day` : campaign.lifetime_budget ? `${(parseInt(campaign.lifetime_budget) / 100).toLocaleString()} total` : "N/A"}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleToggleStatus(campaign.id, campaign.status)}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${campaign.status === "ACTIVE" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`}
                                        >
                                            {campaign.status === "ACTIVE" ? "PAUSE" : "RESUME"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
