"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ApprovalUploadModal } from "@/components/dashboard/ApprovalUploadModal";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { RequestRecord, AuditLog, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
export default function AdminPage() {
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
    const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

    const fetchData = async () => {
        try {
            const [reqRes, logRes] = await Promise.all([
                fetch("/api/requests"),
                fetch("/api/audit-logs"),
            ]);
            if (reqRes.ok) setRequests(await reqRes.json());
            if (logRes.ok) setLogs(await logRes.json());
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleStatusChange = async (requestId: string, newStatus: string) => {
        setStatusUpdating(requestId);
        setActionFeedback(null);
        try {
            const res = await fetch(`/api/requests/${requestId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setActionFeedback({ id: requestId, message: `Status changed to ${newStatus}`, type: "success" });
                await fetchData();
            } else {
                const data = await res.json();
                setActionFeedback({ id: requestId, message: data.error || "Failed", type: "error" });
            }
        } catch {
            setActionFeedback({ id: requestId, message: "Network error", type: "error" });
        } finally {
            setStatusUpdating(null);
            setTimeout(() => setActionFeedback(null), 3000);
        }
    };

    const getStatusColor = (status: string) => {
        return (STATUS_COLORS as Record<string, string>)[status] || "bg-gray-100 text-gray-600";
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case "CREATE": return "bg-emerald-100 text-emerald-700";
            case "APPROVE": return "bg-blue-100 text-blue-700";
            case "REJECT": return "bg-red-100 text-red-700";
            case "UPLOAD_APPROVAL": return "bg-purple-100 text-purple-700";
            case "STATUS_CHANGE": return "bg-indigo-100 text-indigo-700";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const filteredRequests = filterStatus
        ? requests.filter(r => r.status === filterStatus)
        : requests;

    const getRequestLogs = (requestId: string) => {
        return logs.filter(l => l.entity_id === requestId);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <svg className="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    Admin <span className="gradient-text">Panel</span>
                </h1>
                <p className="text-sm text-gray-500">
                    Manage all requests and review submissions
                </p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                    const count = requests.filter(r => r.status === status).length;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
                            className={`glass-card !p-3 text-center transition-all hover:scale-[1.02] ${filterStatus === status ? "ring-2 ring-brand-400" : ""}`}
                        >
                            <p className="text-xl font-bold text-gray-800">{count}</p>
                            <p className={`text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full inline-block ${getStatusColor(status)}`}>
                                {label}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Requests List */}
            <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                    <GlassCard className="text-center py-12">
                        <p className="text-gray-400">No requests found</p>
                    </GlassCard>
                ) : (
                    filteredRequests.map(req => {
                        const isExpanded = expandedRequest === req.id;
                        const reqLogs = getRequestLogs(req.id);

                        return (
                            <GlassCard key={req.id} className="!p-0 overflow-hidden">
                                {/* Main Row */}
                                <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-brand-600">{req.event_id}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(req.status)}`}>
                                                {(STATUS_LABELS as Record<string, string>)[req.status] || req.status}
                                            </span>
                                            {req.approval_file_url && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                                    ๐“ Signed
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 truncate">{req.project_name || "No project"}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            THB {req.amount?.toLocaleString()} - {req.billing_type?.replace("_", " ")} - {new Date(req.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Status Dropdown */}
                                        <select
                                            value={req.status}
                                            onChange={(e) => handleStatusChange(req.id, e.target.value)}
                                            disabled={statusUpdating === req.id}
                                            className="select-field !py-2 !px-3 text-xs w-auto min-w-[130px]"
                                        >
                                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                                <option key={key} value={key}>{label}</option>
                                            ))}
                                        </select>

                                        {/* Upload Approval File */}
                                        {req.status === "PENDING_APPROVAL" && (
                                            <button
                                                onClick={() => { setSelectedRequest(req); setApprovalModalOpen(true); }}
                                                className="px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                                            >
                                                ๐“ {req.approval_file_url ? "Replace File" : "Attach File"}
                                            </button>
                                        )}

                                        {/* Expand/Collapse */}
                                        <button
                                            onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
                                            className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
                                        >
                                            {isExpanded ? "โ–ฒ Close" : "โ–ผ Details"}
                                        </button>
                                    </div>
                                </div>

                                {/* Feedback */}
                                {
                                    actionFeedback && actionFeedback.id === req.id && (
                                        <div className={`mx-5 mb-3 px-3 py-2 rounded-lg text-xs font-medium ${actionFeedback.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                                            {actionFeedback.message}
                                        </div>
                                    )
                                }

                                {/* Expanded Details */}
                                {
                                    isExpanded && (
                                        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-4 animate-slide-up">
                                            {/* Request Details */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-400 text-xs">Requester</span>
                                                    <p className="font-medium text-gray-700">{req.profiles?.name || "N/A"}</p>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 text-xs">Email</span>
                                                    <p className="font-medium text-gray-700">{req.email}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-gray-400 text-xs">Objective</span>
                                                    <p className="font-medium text-gray-700">{req.objective}</p>
                                                </div>
                                                {req.approval_notes && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-400 text-xs">Approval Notes</span>
                                                        <p className="font-medium text-gray-700">{req.approval_notes}</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Approval File Preview */}
                                            {req.approval_file_url && (
                                                <div>
                                                    <span className="text-gray-400 text-xs block mb-2">Attached Approval Document</span>
                                                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-purple-600 text-lg">๐“</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-700 truncate">
                                                                {req.approval_file_url.startsWith("data-ref:") ? req.approval_file_url.replace("data-ref:", "") : "Approval Document"}
                                                            </p>
                                                            <p className="text-xs text-gray-400">Signed approval file</p>
                                                        </div>
                                                        {!req.approval_file_url.startsWith("data-ref:") && (
                                                            <a
                                                                href={req.approval_file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                                                            >
                                                                View / Download
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Audit Logs for this request */}
                                            <div>
                                                <span className="text-gray-400 text-xs block mb-2">Activity Log</span>
                                                {reqLogs.length === 0 ? (
                                                    <p className="text-xs text-gray-400">No activity recorded</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {reqLogs.map(log => (
                                                            <div key={log.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0 mt-0.5 ${getActionColor(log.action)}`}>
                                                                    {log.action}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs text-gray-600">
                                                                        <span className="font-medium">{log.user_name || "System"}</span>
                                                                        {log.changes && typeof log.changes === "object" && (
                                                                            <span className="text-gray-400 ml-1">
                                                                                - {Object.entries(log.changes).map(([k, v]) => `${k}: ${v}`).join(", ")}
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 flex-shrink-0">
                                                                    {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Sub-Project Allocation */}
                                            <SubProjectAllocation
                                                requestId={req.id}
                                                totalAmount={req.amount}
                                                isApproved={req.status === 'APPROVED'}
                                            />
                                        </div>
                                    )
                                }
                            </GlassCard>
                        );
                    })
                )}
            </div>

            {/* Approval Upload Modal */}
            <ApprovalUploadModal
                isOpen={approvalModalOpen}
                onClose={() => { setApprovalModalOpen(false); setSelectedRequest(null); }}
                requestId={selectedRequest?.id || null}
                eventId={selectedRequest?.event_id || ""}
                onSuccess={fetchData}
            />
        </div >
    );
}
