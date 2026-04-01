"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AuditLog } from "@/lib/types";

/* โ”€โ”€ Helpers โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€โ”€ */
const STATUS_LABEL_MAP: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

const describeAuditChange = (action: string, changes: Record<string, unknown> | null): string => {
    if (!changes || typeof changes !== "object") {
        const labels: Record<string, string> = {
            CREATE: "Created this request",
            APPROVE: "Approved this request",
            REJECT: "Rejected this request",
            CANCEL: "Cancelled this request",
            UPLOAD: "Uploaded a receipt",
            UPLOAD_APPROVAL: "Uploaded signed approval document",
            SEND_APPROVAL: "Sent approval email to manager",
            VERIFY: "Verified receipt",
            STATUS_CHANGE: "Changed request status",
            DELETE: "Deleted this request",
        };
        return labels[action] || action;
    }
    switch (action) {
        case "STATUS_CHANGE": {
            const from = STATUS_LABEL_MAP[changes.old_status as string] || (changes.old_status as string);
            const to = STATUS_LABEL_MAP[changes.new_status as string] || (changes.new_status as string);
            let msg = `Changed status: ${from} 🔄 ${to}`;
            if (changes.notes) msg += ` 🆕 "${changes.notes}"`;
            return msg;
        }
        case "APPROVE": {
            const from = STATUS_LABEL_MAP[changes.old_status as string] || "";
            let msg = "Approved this request";
            if (from) msg += ` (was ${from})`;
            if (changes.notes) msg += ` — "${changes.notes}"`;
            return msg;
        }
        case "REJECT": {
            let msg = "Rejected this request";
            if (changes.notes) msg += ` ❌ "${changes.notes}"`;
            return msg;
        }
        case "CANCEL": {
            let msg = "Cancelled this request";
            if (changes.notes) msg += ` 🚫 "${changes.notes}"`;
            return msg;
        }
        case "CREATE":
            return `Created request${changes.event_id ? ` ${changes.event_id}` : ""}`;
        case "UPLOAD":
            return `Uploaded receipt${changes.month_year ? ` for ${changes.month_year}` : ""}`;
        case "UPLOAD_APPROVAL":
            return `Uploaded signed approval document${changes.file_name ? `: ${changes.file_name}` : ""}`;
        case "SEND_APPROVAL":
            return `Sent approval email${changes.to ? ` to ${changes.to}` : ""}`;
        case "VERIFY":
            return `Verified receipt${changes.month_year ? ` for ${changes.month_year}` : ""}`;
        default:
            return Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(", ");
    }
};

const ACTION_OPTIONS = [
    { value: "", label: "All Actions" },
    { value: "CREATE", label: "Create" },
    { value: "APPROVE", label: "Approve" },
    { value: "REJECT", label: "Reject" },
    { value: "CANCEL", label: "Cancel" },
    { value: "STATUS_CHANGE", label: "Status Change" },
    { value: "UPLOAD", label: "Upload Receipt" },
    { value: "UPLOAD_APPROVAL", label: "Upload Approval" },
    { value: "SEND_APPROVAL", label: "Send Approval" },
    { value: "VERIFY", label: "Verify" },
];


export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [filterEntity, setFilterEntity] = useState("");
    const [filterAction, setFilterAction] = useState("");
    const [searchId, setSearchId] = useState("");
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
            case "CANCEL": return "bg-orange-100 text-orange-700";
            case "UPLOAD": return "bg-amber-100 text-amber-700";
            case "UPLOAD_APPROVAL": return "bg-purple-100 text-purple-700";
            case "VERIFY": return "bg-teal-100 text-teal-700";
            case "SEND_APPROVAL": return "bg-indigo-100 text-indigo-700";
            case "STATUS_CHANGE": return "bg-cyan-100 text-cyan-700";
            default: return "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300";
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case "CREATE": return "🆕";
            case "APPROVE": return "✅";
            case "REJECT": return "❌";
            case "CANCEL": return "🚫";
            case "UPLOAD_APPROVAL": return "📄";
            case "UPLOAD": return "📄";
            case "SEND_APPROVAL": return "📧";
            case "STATUS_CHANGE": return "🔄";
            case "VERIFY": return "✅";
            default: return "❓";
        }
    };

    const getEntityIcon = (entityType: string) => {
        switch (entityType) {
            case "REQUEST":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                );
            case "PROJECT":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                );
            case "RECEIPT":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                        <path d="M12 17.5v-11" />
                    </svg>
                );
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                );
        }
    };


    let filteredLogs = logs;
    if (filterAction) {
        filteredLogs = filteredLogs.filter((l: AuditLog) => l.action === filterAction);
    }
    if (searchId.trim()) {
        const q = searchId.trim().toLowerCase();
        filteredLogs = filteredLogs.filter((l: AuditLog) =>
            l.entity_id?.toLowerCase().includes(q) ||
            l.user_name?.toLowerCase().includes(q)
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    Activity <span className="gradient-text">Logs</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Track all system actions: creates, approvals, uploads, and more.
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <select
                    value={filterEntity}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterEntity(e.target.value)}
                    className="select-field w-full sm:w-auto sm:min-w-[160px] text-sm"
                >
                    <option value="">All Entities</option>
                    <option value="REQUEST">Requests</option>
                    <option value="PROJECT">Projects</option>
                    <option value="RECEIPT">Receipts</option>
                </select>
                <select
                    value={filterAction}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterAction(e.target.value)}
                    className="select-field w-full sm:w-auto sm:min-w-[160px] text-sm"
                >
                    {ACTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={searchId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchId(e.target.value)}
                    placeholder="Search by ID or name..."
                    className="input-field w-full sm:w-auto sm:min-w-[200px] text-sm"
                />
            </div>

            {/* Summary */}
            <div className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                Showing {filteredLogs.length} of {logs.length} entries
            </div>

            {/* Logs List */}
            {loading ? (
                <GlassCard className="text-center py-12">
                    <svg className="animate-spin w-8 h-8 text-brand-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-sm">Loading audit logs...</p>
                </GlassCard>
            ) : filteredLogs.length === 0 ? (
                <GlassCard className="text-center py-12">
                    <p className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">No audit logs found</p>
                </GlassCard>
            ) : (
                <div className="space-y-2">
                    {filteredLogs.map((log: AuditLog) => (
                        <GlassCard key={log.id} hover className="!p-3 sm:!p-4">
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className="flex-shrink-0 hidden sm:block mt-0.5">{getEntityIcon(log.entity_type)}</div>

                                {/* Action dot (mobile) */}
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 sm:hidden ${getActionColor(log.action)}`}>
                                    {getActionIcon(log.action)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono">{log.entity_type}</span>
                                        <span className="text-[10px] text-gray-300 hidden sm:inline">✅</span>
                                        <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-mono break-all">{log.entity_id?.substring(0, 8)}...</span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap leading-relaxed">
                                        {log.user_name && <span className="font-medium">{log.user_name}</span>}
                                        {log.user_name && " ✅ "}
                                        {describeAuditChange(log.action, log.changes)}
                                    </p>
                                </div>

                                {/* Timestamp */}
                                <div className="text-right text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
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

