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
            case "REQUEST": 
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                );
            case "PROJECT": 
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                );
            case "RECEIPT": 
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                        <path d="M12 17.5v-11" />
                    </svg>
                );
            default: 
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                );
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
                                    <p className="text-sm text-gray-600 break-all">
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
