"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { RequestRecord, STATUS_COLORS } from "@/lib/types";

interface AnalyticsTabProps {
    requests: RequestRecord[];
}

/* โ”€โ”€ Quick-presets for convenience โ”€โ”€โ”€ */
const PRESETS = [
    { label: "All Time", days: 0 },
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
    { label: "This Year", days: -1 },
] as const;

function toInputDate(d: Date) {
    return d.toISOString().slice(0, 10);
}

export function AnalyticsTab({ requests }: AnalyticsTabProps) {
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    /* โ”€โ”€ Apply preset โ”€โ”€โ”€ */
    function applyPreset(days: number) {
        if (days === 0) {
            setStartDate("");
            setEndDate("");
            return;
        }
        const today = new Date();
        setEndDate(toInputDate(today));
        if (days === -1) {
            // This Year
            setStartDate(toInputDate(new Date(today.getFullYear(), 0, 1)));
        } else {
            const start = new Date();
            start.setDate(start.getDate() - days);
            setStartDate(toInputDate(start));
        }
    }

    /* โ”€โ”€ Filtered requests โ”€โ”€โ”€ */
    const filtered = useMemo(() => {
        if (!startDate && !endDate) return requests;
        return requests.filter((req) => {
            // Use the request's own start_date for range comparison
            const reqDate = req.start_date || req.created_at;
            if (!reqDate) return true;
            const d = reqDate.slice(0, 10); // 'YYYY-MM-DD' substring
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        });
    }, [requests, startDate, endDate]);

    /**
     * useMemo is a React hook that "remembers" (caches) the result of a calculation.
     * It will only re-run this heavy math loop if `filtered` (the filtered list of requests) changes.
     * This prevents the app from slowing down every time the user clicks a button.
     */
    const stats = useMemo(() => {
        let totalSpent = 0;
        let pendingAmount = 0;
        const projectSpend: Record<string, number> = {};
        const statusCount: Record<string, number> = {};
        const monthlySpend: Record<string, number> = {};

        filtered.forEach((req) => {
            const amt = req.amount || 0;
            
            // 1. Count how many requests are in each status (e.g., 5 APPROVED, 2 DRAFT)
            statusCount[req.status] = (statusCount[req.status] || 0) + 1;

            // 2. Tally up the total money spent vs pending money
            if (["APPROVED", "COMPLETED", "ACTIVE"].includes(req.status)) {
                totalSpent += amt;
            } else if (["PENDING_APPROVAL", "DRAFT"].includes(req.status)) {
                pendingAmount += amt;
            }

            // 3. Track spending per project
            const pName = req.project_name || "Uncategorized";
            projectSpend[pName] = (projectSpend[pName] || 0) + amt;

            // 4. Calculate monthly trends for the bar chart
            // We slice the date string "2024-05-12T10:00:00" to just "2024-05"
            const d = req.start_date || req.created_at;
            if (d) {
                const monthKey = d.slice(0, 7); // "YYYY-MM"
                monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + amt;
            }
        });

        // Top 5 projects
        const topProjects = Object.entries(projectSpend)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, val]) => ({ name, value: val }));
        const maxProjectVal = Math.max(...topProjects.map((p) => p.value), 1);

        // Monthly trend data (sorted chronologically)
        const monthlyData = Object.entries(monthlySpend)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, value]) => ({ month, value }));
        const maxMonthlyVal = Math.max(...monthlyData.map((m) => m.value), 1);

        return { totalSpent, pendingAmount, statusCount, topProjects, maxProjectVal, monthlyData, maxMonthlyVal };
    }, [filtered]);

    /* โ”€โ”€ Formatted date range label โ”€โ”€โ”€ */
    const rangeLabel = startDate && endDate
        ? `${new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} โ€“ ${new Date(endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
        : startDate
            ? `From ${new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
            : endDate
                ? `Until ${new Date(endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                : "All Time";

    return (
        <div className="space-y-6 animate-slide-up">
            {/* Date Range Picker */}
            <GlassCard className="!p-4 sm:!p-5">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Analysis Period
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-0.5">{rangeLabel} ยท <span className="font-semibold text-brand-600">{filtered.length}</span> requests in range</p>
                        </div>
                        {/* Quick presets */}
                        <div className="flex flex-wrap gap-1.5">
                            {PRESETS.map((p) => {
                                const isActive =
                                    (p.days === 0 && !startDate && !endDate) ||
                                    (p.days === -1 && startDate === toInputDate(new Date(new Date().getFullYear(), 0, 1)) && endDate === toInputDate(new Date())) ||
                                    (p.days > 0 && (() => { const s = new Date(); s.setDate(s.getDate() - p.days); return startDate === toInputDate(s) && endDate === toInputDate(new Date()); })());
                                return (
                                    <button
                                        key={p.label}
                                        onClick={() => applyPreset(p.days)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive ? "bg-brand-500 text-white shadow-md shadow-brand-200" : "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200"}`}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {/* Date Inputs */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input-field w-full text-sm"
                                max={endDate || undefined}
                            />
                        </div>
                        <span className="hidden sm:block text-gray-300 font-bold pb-2.5">โ’</span>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="input-field w-full text-sm"
                                min={startDate || undefined}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(""); setEndDate(""); }}
                                className="text-xs font-semibold text-red-500 hover:text-red-700 px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* Overview KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="border-l-4 border-l-emerald-500 !p-5">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Total Approved/Spent</h3>
                    <p className="text-2xl font-black text-emerald-700">
                        <span className="text-sm font-semibold mr-1">THB</span>
                        {stats.totalSpent.toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className="border-l-4 border-l-amber-500 !p-5">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Pending Value</h3>
                    <p className="text-2xl font-black text-amber-700">
                        <span className="text-sm font-semibold mr-1">THB</span>
                        {stats.pendingAmount.toLocaleString()}
                    </p>
                </GlassCard>
                <GlassCard className="border-l-4 border-l-brand-500 !p-5">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Total Requests</h3>
                    <p className="text-2xl font-black text-brand-700">{filtered.length}</p>
                </GlassCard>
            </div>

            {/* Monthly Spend Trend */}
            {stats.monthlyData.length > 1 && (
                <GlassCard className="!p-5">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Monthly Spend Trend
                    </h3>
                    <div className="flex items-end gap-1.5 h-40">
                        {stats.monthlyData.map((m, idx) => {
                            const heightPct = (m.value / stats.maxMonthlyVal) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group" title={`${m.month}: THB ${m.value.toLocaleString()}`}>
                                    <span className="text-[9px] font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {(m.value / 1000).toFixed(0)}k
                                    </span>
                                    <div
                                        className="w-full bg-gradient-to-t from-brand-500 to-brand-300 rounded-t-md transition-all duration-700 ease-out hover:from-brand-600 hover:to-brand-400"
                                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                                    />
                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                                        {new Date(m.month + "-01").toLocaleDateString("en-GB", { month: "short" })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </GlassCard>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Custom CSS Bar Chart: Spend by Project */}
                <GlassCard className="!p-5">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-500" />
                        Top Projects by Spend
                    </h3>
                    <div className="space-y-5">
                        {stats.topProjects.length === 0 ? (
                            <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm text-center py-6">No project data in selected range</p>
                        ) : (
                            stats.topProjects.map((proj, idx) => {
                                const percent = (proj.value / stats.maxProjectVal) * 100;
                                return (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between text-xs font-medium mb-1.5">
                                            <span className="text-gray-700 dark:text-gray-200 truncate pr-4">{proj.name}</span>
                                            <span className="text-brand-700 whitespace-nowrap">THB {proj.value.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden">
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
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        Requests by Status
                    </h3>
                    <div className="space-y-4">
                        {Object.entries(stats.statusCount)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count], idx) => {
                                const percent = (count / filtered.length) * 100;
                                const baseClass = (STATUS_COLORS as Record<string, string>)[status] || "text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 bg-gray-200";
                                const colorMatch = baseClass.match(/text-([a-z]+)-[0-9]+/);
                                const colorName = colorMatch ? colorMatch[1] : "gray";

                                return (
                                    <div key={idx} className="flex items-center gap-4">
                                        <div className="w-32 flex-shrink-0">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold block w-max ${baseClass}`}>
                                                {status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800/80 rounded-full overflow-hidden flex">
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
                                        <div className="w-8 text-right text-xs font-bold text-gray-600 dark:text-gray-300">
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

