"use client";

import { useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { RequestRecord, STATUS_COLORS } from "@/lib/types";

interface AnalyticsTabProps {
    requests: RequestRecord[];
}

export function AnalyticsTab({ requests }: AnalyticsTabProps) {
    // Analytics calculations
    const stats = useMemo(() => {
        let totalSpent = 0;
        let pendingAmount = 0;
        const projectSpend: Record<string, number> = {};
        const statusCount: Record<string, number> = {};

        requests.forEach((req) => {
            const amt = req.amount || 0;
            // Status counts
            statusCount[req.status] = (statusCount[req.status] || 0) + 1;

            // Spend logic
            if (["APPROVED", "COMPLETED", "ACTIVE"].includes(req.status)) {
                totalSpent += amt;
            } else if (["PENDING_APPROVAL", "DRAFT"].includes(req.status)) {
                pendingAmount += amt;
            }

            // Project Spend
            const pName = req.project_name || "Uncategorized";
            projectSpend[pName] = (projectSpend[pName] || 0) + amt;
        });

        // Format project spend for bar chart
        const topProjects = Object.entries(projectSpend)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // Top 5
            .map(([name, val]) => ({ name, value: val }));

        // Format rules
        const maxProjectVal = Math.max(...topProjects.map((p) => p.value), 1);

        return { totalSpent, pendingAmount, statusCount, topProjects, maxProjectVal };
    }, [requests]);

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Overview KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="border-l-4 border-l-emerald-500 !p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Approved/Spent</h3>
                    <p className="text-2xl font-black text-emerald-700">
                        <span className="text-sm font-semibold mr-1">THB</span>
                        {stats.totalSpent.toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className="border-l-4 border-l-amber-500 !p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pending Value</h3>
                    <p className="text-2xl font-black text-amber-700">
                        <span className="text-sm font-semibold mr-1">THB</span>
                        {stats.pendingAmount.toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className="border-l-4 border-l-brand-500 !p-5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Requests</h3>
                    <p className="text-2xl font-black text-brand-700">{requests.length}</p>
                </GlassCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Custom CSS Bar Chart: Spend by Project */}
                <GlassCard className="!p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-500" />
                        Top Projects by Spend
                    </h3>
                    <div className="space-y-5">
                        {stats.topProjects.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">No project data</p>
                        ) : (
                            stats.topProjects.map((proj, idx) => {
                                const percent = (proj.value / stats.maxProjectVal) * 100;
                                return (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between text-xs font-medium mb-1.5">
                                            <span className="text-gray-700 truncate pr-4">{proj.name}</span>
                                            <span className="text-brand-700 whitespace-nowrap">THB {proj.value.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-1000 ease-out"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </GlassCard>

                {/* Custom CSS Chart: Status Distribution */}
                <GlassCard className="!p-5">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Requests by Status
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.statusCount)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count], idx) => {
                                const percent = (count / requests.length) * 100;
                                // Need to parse status colors for aesthetic fallback
                                const baseClass = (STATUS_COLORS as Record<string, string>)[status] || "text-gray-500 bg-gray-200";
                                // Extract the text-color e.g., "text-emerald-800"
                                const colorMatch = baseClass.match(/text-([a-z]+)-[0-9]+/);
                                const colorName = colorMatch ? colorMatch[1] : "gray";

                                return (
                                    <div key={idx} className="flex items-center gap-4">
                                        {/* Status Label */}
                                        <div className="w-32 flex-shrink-0">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold block w-max ${baseClass}`}>
                                                {status.replace("_", " ")}
                                            </span>
                                        </div>
                                        {/* Bar */}
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                            <div
                                                className={`h-full transition-all duration-1000 ease-out flex items-center justify-end pr-1 text-[8px] font-bold text-white shadow-inner bg-${colorName}-500`}
                                                style={{ 
                                                    width: `${percent}%`,
                                                    backgroundColor: colorName === 'emerald' ? '#10b981' :
                                                                     colorName === 'brand' ? '#8b5cf6' :
                                                                     colorName === 'amber' ? '#f59e0b' :
                                                                     colorName === 'blue' ? '#3b82f6' :
                                                                     colorName === 'red' ? '#ef4444' :
                                                                     colorName === 'green' ? '#22c55e' :
                                                                     '#6b7280'
                                                }}
                                            />
                                        </div>
                                        {/* Count */}
                                        <div className="w-8 text-right text-xs font-bold text-gray-600">
                                            {count}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
