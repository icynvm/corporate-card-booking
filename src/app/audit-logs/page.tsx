"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AuditLog } from "@/lib/types";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filterEntity, setFilterEntity] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const params = new URLSearchParams();
                if (filterEntity) params.set("entityType", filterEntity);

                const res = await fetch(`/api/audit-logs?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [filterEntity]);

    const getActionColor = (action: string) => {
        switch (action) {
            case "CREATE": return "bg-emerald-100 text-emerald-700";
            case "APPROVE": return "bg-blue-100 text-blue-700";
            case "REJECT": return "bg-red-100 text-red-700";
            case "UPLOAD": return "bg-amber-100 text-amber-700";
            case "VERIFY": return "bg-purple-100 text-purple-700";
            case "SEND_APPROVAL": return "bg-indigo-100 text-indigo-700";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const getEntityIcon = (entityType: string) => {
        switch (entityType) {
            case "REQUEST": return "📋";
            case "PROJECT": return "📁";
            case "RECEIPT": return "🧾";
            default: return "📄";
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    Activity <span className="gradient-text">Logs</span>
                </h1>
                <p className="text-sm text-gray-500">
                    Track all system actions: creates, approvals, uploads, and more.
                </p>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
                <select
                    value={filterEntity}
                    onChange={(e) => setFilterEntity(e.target.value)}
                    className="select-field w-auto min-w-[180px]"
                >
                    <option value="">All Activities</option>
                    <option value="REQUEST">Requests</option>
                    <option value="PROJECT">Projects</option>
                    <option value="RECEIPT">Receipts</option>
                </select>
            </div>

            {/* Logs List */}
            {loading ? (
                <GlassCard className="text-center py-12">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 text-sm">Loading audit logs...</p>
                </GlassCard>
            ) : logs.length === 0 ? (
                <GlassCard className="text-center py-12">
                    <p className="text-gray-400">No audit logs found</p>
                </GlassCard>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => (
                        <GlassCard key={log.id} hover className="!p-4">
                            <div className="flex items-start gap-4">
                                <div className="text-2xl">{getEntityIcon(log.entity_type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">{log.entity_type}</span>
                                        <span className="text-xs text-gray-300">•</span>
                                        <span className="text-xs text-gray-400 font-mono">{log.entity_id?.substring(0, 8)}...</span>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {log.user_name && <span className="font-medium">{log.user_name}</span>}
                                        {log.user_name && " — "}
                                        {log.changes && typeof log.changes === "object" && (
                                            <span className="text-gray-400">
                                                {Object.entries(log.changes).map(([k, v]) => `${k}: ${v}`).join(", ")}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right text-xs text-gray-400 whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleDateString("en-GB", {
                                        day: "2-digit", month: "short", year: "numeric",
                                    })}
                                    <br />
                                    {new Date(log.created_at).toLocaleTimeString("en-GB", {
                                        hour: "2-digit", minute: "2-digit",
                                    })}
                                </div>
                            </div>
                        </GlassCard>
                    ))}
                </div>
            )}
        </div>
    );
}
