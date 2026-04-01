"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequestRecord, STATUS_COLORS } from "@/lib/types";
import { 
    Calendar, 
    TrendingUp, 
    DollarSign, 
    FileText, 
    Clock, 
    PieChart, 
    BarChart3, 
    X,
    ArrowRight,
    TrendingDown,
    Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyticsTabProps {
    requests: RequestRecord[];
}

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

    function applyPreset(days: number) {
        if (days === 0) {
            setStartDate("");
            setEndDate("");
            return;
        }
        const today = new Date();
        setEndDate(toInputDate(today));
        if (days === -1) {
            setStartDate(toInputDate(new Date(today.getFullYear(), 0, 1)));
        } else {
            const start = new Date();
            start.setDate(start.getDate() - days);
            setStartDate(toInputDate(start));
        }
    }

    const filtered = useMemo(() => {
        if (!startDate && !endDate) return requests;
        return requests.filter((req) => {
            const reqDate = req.start_date || req.created_at;
            if (!reqDate) return true;
            const d = reqDate.slice(0, 10);
            if (startDate && d < startDate) return false;
            if (endDate && d > endDate) return false;
            return true;
        });
    }, [requests, startDate, endDate]);

    const stats = useMemo(() => {
        let totalSpent = 0;
        let pendingAmount = 0;
        const projectSpend: Record<string, number> = {};
        const statusCount: Record<string, number> = {};
        const monthlySpend: Record<string, number> = {};

        filtered.forEach((req) => {
            const amt = req.amount || 0;
            statusCount[req.status] = (statusCount[req.status] || 0) + 1;

            if (["APPROVED", "COMPLETED", "ACTIVE"].includes(req.status)) {
                totalSpent += amt;
            } else if (["PENDING_APPROVAL", "DRAFT"].includes(req.status)) {
                pendingAmount += amt;
            }

            const pName = req.project_name || "Uncategorized";
            projectSpend[pName] = (projectSpend[pName] || 0) + amt;

            const d = req.start_date || req.created_at;
            if (d) {
                const monthKey = d.slice(0, 7);
                monthlySpend[monthKey] = (monthlySpend[monthKey] || 0) + amt;
            }
        });

        const topProjects = Object.entries(projectSpend)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));
        const maxProjectVal = Math.max(...topProjects.map((p) => p.value), 1);

        const monthlyData = Object.entries(monthlySpend)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, value]) => ({ month, value }));
        const maxMonthlyVal = Math.max(...monthlyData.map((m) => m.value), 1);

        return { totalSpent, pendingAmount, statusCount, topProjects, maxProjectVal, monthlyData, maxMonthlyVal };
    }, [filtered]);

    const rangeLabel = startDate && endDate
        ? `${new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} – ${new Date(endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
        : startDate
            ? `From ${new Date(startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
            : endDate
                ? `Until ${new Date(endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                : "All Time Range";

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Filter Controls */}
            <Card className="border-none shadow-lg bg-white/50 backdrop-blur-md">
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-brand-600" />
                                Analysis Period
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                {rangeLabel} • <span className="font-bold text-brand-700">{filtered.length} records</span>
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100 rounded-xl w-fit">
                            {PRESETS.map((p) => {
                                const isActive =
                                    (p.days === 0 && !startDate && !endDate) ||
                                    (p.days === -1 && startDate === toInputDate(new Date(new Date().getFullYear(), 0, 1)) && endDate === toInputDate(new Date())) ||
                                    (p.days > 0 && (() => { const s = new Date(); s.setDate(s.getDate() - p.days); return startDate === toInputDate(s) && endDate === toInputDate(new Date()); })());
                                
                                return (
                                    <Button
                                        key={p.label}
                                        variant={isActive ? "brand" : "ghost"}
                                        size="sm"
                                        className={cn("h-8 px-3 text-[11px] font-bold rounded-lg transition-all", !isActive && "text-gray-500 hover:text-gray-900 hover:bg-white")}
                                        onClick={() => applyPreset(p.days)}
                                    >
                                        {p.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end max-w-3xl">
                        <div className="flex-1 space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white/80 border-gray-200"
                                max={endDate || undefined}
                            />
                        </div>
                        <div className="hidden sm:flex h-9 items-center px-2 opacity-20">
                            <ArrowRight className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white/80 border-gray-200"
                                min={startDate || undefined}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 px-4 text-red-500 hover:text-red-600 hover:bg-red-50 font-bold"
                                onClick={() => { setStartDate(""); setEndDate(""); }}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Reset
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card glass className="border-none shadow-md overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Realized Spend</CardTitle>
                        <TrendingUp className="w-4 h-4 text-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-gray-900">
                            <span className="text-xs font-bold text-gray-400 mr-1.5">THB</span>
                            {stats.totalSpent.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-emerald-600 font-bold mt-1">Confirmed & Processed</p>
                    </CardContent>
                </Card>

                <Card glass className="border-none shadow-md overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outstanding Liability</CardTitle>
                        <Clock className="w-4 h-4 text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-gray-900">
                            <span className="text-xs font-bold text-gray-400 mr-1.5">THB</span>
                            {stats.pendingAmount.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-amber-600 font-bold mt-1">Awaiting Final Approval</p>
                    </CardContent>
                </Card>

                <Card glass className="border-none shadow-md overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-brand-500" />
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transaction Volume</CardTitle>
                        <Activity className="w-4 h-4 text-brand-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-gray-900">{filtered.length}</div>
                        <p className="text-[10px] text-brand-600 font-bold mt-1">Total Active Records</p>
                    </CardContent>
                </Card>
            </div>

            {/* Trends Section */}
            {stats.monthlyData.length > 1 && (
                <Card className="border-none shadow-md bg-white/50">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand-600" />
                            Monthly Spending Velocity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-2 h-48 mt-4">
                            {stats.monthlyData.map((m, idx) => {
                                const heightPct = (m.value / stats.maxMonthlyVal) * 100;
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group" title={`${m.month}: THB ${m.value.toLocaleString()}`}>
                                        <div className="relative flex-1 w-full flex items-end">
                                            <div
                                                className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-xl transition-all duration-1000 ease-out group-hover:from-brand-500 group-hover:to-brand-300 group-hover:shadow-lg group-hover:shadow-brand/20"
                                                style={{ height: `${Math.max(heightPct, 4)}%` }}
                                            />
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded pointer-events-none transition-opacity whitespace-nowrap">
                                                ฿{(m.value / 1000).toFixed(1)}k
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                                            {new Date(m.month + "-01").toLocaleDateString("en-GB", { month: "short" })}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Horizontal Bar Chart: Projects */}
                <Card className="border-none shadow-md bg-white/50 overflow-hidden">
                    <CardHeader className="border-b bg-gray-50/30">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-brand-600" />
                            Top Allocations by Project
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        {stats.topProjects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BarChart3 className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-xs font-medium">No cost center data available</p>
                            </div>
                        ) : (
                            stats.topProjects.map((proj, idx) => {
                                const percent = (proj.value / stats.maxProjectVal) * 100;
                                return (
                                    <div key={idx} className="space-y-1.5 group">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-gray-700 truncate pr-4">{proj.name}</span>
                                            <span className="text-[10px] font-bold text-brand-700">฿{proj.value.toLocaleString()}</span>
                                        </div>
                                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-1000 ease-out group-hover:scale-y-110 origin-left"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>

                {/* Horizontal Bar Chart: Status */}
                <Card className="border-none shadow-md bg-white/50 overflow-hidden">
                    <CardHeader className="border-b bg-gray-50/30">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-purple-600" />
                            System-wide Status Mix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        {Object.entries(stats.statusCount)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count], idx) => {
                                const percent = (count / filtered.length) * 100;
                                const baseColorClass = (STATUS_COLORS as Record<string, string>)[status] || "bg-gray-500";
                                const colorMatch = baseColorClass.match(/text-([a-z]+)-[0-9]+/);
                                const colorName = colorMatch ? colorMatch[1] : "indigo";
                                
                                const hexMap: Record<string, string> = {
                                    emerald: '#10b981',
                                    brand: '#8b5cf6',
                                    amber: '#f59e0b',
                                    blue: '#3b82f6',
                                    red: '#ef4444',
                                    green: '#22c55e',
                                    purple: '#a855f7',
                                    indigo: '#6366f1'
                                };

                                return (
                                    <div key={idx} className="flex items-center gap-4 group">
                                        <div className="w-24 shrink-0">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider block text-center truncate",
                                                baseColorClass
                                            )}>
                                                {status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                                            <div
                                                className="h-full transition-all duration-1000 ease-out flex items-center justify-end pr-1.5 group-hover:brightness-110"
                                                style={{
                                                    width: `${percent}%`,
                                                    backgroundColor: hexMap[colorName] || '#6366f1'
                                                }}
                                            >
                                                <span className="text-[8px] font-black text-white drop-shadow-md">
                                                    {percent > 10 ? `${percent.toFixed(0)}%` : ""}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-8 text-right text-xs font-black text-gray-900 border-l border-gray-100 pl-3">
                                            {count}
                                        </div>
                                    </div>
                                );
                            })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
