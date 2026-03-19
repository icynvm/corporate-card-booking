"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ApprovalUploadModal } from "@/components/dashboard/ApprovalUploadModal";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { RequestRecord, AuditLog, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { UserRolesTab } from "@/components/admin/UserRolesTab";

/* ── helpers ────────────────────────────────────── */
const downloadFile = async (url: string) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlBlob;
        const filename = url.split("/").pop()?.split("?")[0] || "document.pdf";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
        console.error("Download failed:", error);
    }
};

const STATUS_LABEL_MAP: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

/** Convert raw audit‑log changes into a human sentence */
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
            let msg = `Changed status: ${from} → ${to}`;
            if (changes.notes) msg += ` — "${changes.notes}"`;
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
            if (changes.notes) msg += ` — "${changes.notes}"`;
            return msg;
        }
        case "CANCEL": {
            let msg = "Cancelled this request";
            if (changes.notes) msg += ` — "${changes.notes}"`;
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

const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ── component ──────────────────────────────────── */
export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<"requests" | "analytics" | "roles">("requests");
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

    // Email Settings State
    const [showEmailSettings, setShowEmailSettings] = useState(false);
    const [managerEmail, setManagerEmail] = useState("");
    const [savingSettings, setSavingSettings] = useState(false);

    // Toast State
    const [toasts, setToasts] = useState<{ id: string; message: string; severity: AlertSeverity }[]>([]);

    const addToast = (message: string, severity: AlertSeverity = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev: { id: string; message: string; severity: AlertSeverity }[]) => [...prev, { id, message, severity }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev: { id: string; message: string; severity: AlertSeverity }[]) => prev.filter((t: { id: string }) => t.id !== id));
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings");
            if (res.ok) {
                const data = await res.json();
                setManagerEmail(data.managerEmail || "");
            }
        } catch {}
    };

    const saveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "MANAGER_EMAIL", value: managerEmail }),
            });
            if (res.ok) {
                addToast("Email settings saved successfully", "success");
            } else {
                addToast("Failed to save settings", "error");
            }
        } catch {
            addToast("Network error saving settings", "error");
        } finally {
            setSavingSettings(false);
        }
    };

    const fetchData = async () => {
        try {
            const [reqRes, logRes] = await Promise.all([
                fetch("/api/requests"),
                fetch("/api/audit-logs"),
            ]);
            if (reqRes.ok) setRequests(await reqRes.json());
            if (logRes.ok) setLogs(await logRes.json());
        } catch {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchSettings();
    }, []);

    const handleStatusChange = async (requestId: string, newStatus: string) => {
        setStatusUpdating(requestId);
        try {
            const res = await fetch(`/api/requests/${requestId}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                addToast(`Status changed to ${newStatus}`, "success");
                await fetchData();
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to update status", "error");
            }
        } catch {
            addToast("Network error updating status", "error");
        } finally {
            setStatusUpdating(null);
        }
    };

    const handleDeleteRequest = async (requestId: string, eventId: string) => {
        if (!window.confirm(`Are you sure you want to delete request ${eventId}? This action cannot be undone.`)) {
            return;
        }
        try {
            const res = await fetch(`/api/requests/${requestId}`, { method: "DELETE" });
            if (res.ok) {
                addToast(`Request ${eventId} deleted successfully`, "success");
                await fetchData();
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to delete request", "error");
            }
        } catch {
            addToast("Network error deleting request", "error");
        }
    };

    const getStatusColor = (status: string) =>
        (STATUS_COLORS as Record<string, string>)[status] || "bg-gray-100 text-gray-600";

    const getActionColor = (action: string) => {
        switch (action) {
            case "CREATE": return "bg-emerald-100 text-emerald-700";
            case "APPROVE": return "bg-blue-100 text-blue-700";
            case "REJECT": return "bg-red-100 text-red-700";
            case "CANCEL": return "bg-orange-100 text-orange-700";
            case "UPLOAD_APPROVAL": return "bg-purple-100 text-purple-700";
            case "UPLOAD": return "bg-amber-100 text-amber-700";
            case "SEND_APPROVAL": return "bg-indigo-100 text-indigo-700";
            case "STATUS_CHANGE": return "bg-cyan-100 text-cyan-700";
            case "VERIFY": return "bg-teal-100 text-teal-700";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case "CREATE": return "✦";
            case "APPROVE": return "✓";
            case "REJECT": return "✗";
            case "CANCEL": return "⊘";
            case "UPLOAD_APPROVAL": return "📎";
            case "UPLOAD": return "📄";
            case "SEND_APPROVAL": return "✉";
            case "STATUS_CHANGE": return "⟳";
            case "VERIFY": return "☑";
            default: return "•";
        }
    };

    const filteredRequests = filterStatus
        ? requests.filter((r: RequestRecord) => r.status === filterStatus)
        : requests;

    const getRequestLogs = (requestId: string) =>
        logs.filter((l: AuditLog) => l.entity_id === requestId);

    /* ── loading state ── */
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

    /* ── render ── */
    return (
        <div className="space-y-6 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1">
                        Admin <span className="gradient-text">Panel</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500">
                        Manage all requests and review submissions
                    </p>
                </div>
                <button
                    onClick={() => setShowEmailSettings(!showEmailSettings)}
                    className="btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-2 flex items-center gap-2 self-start"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>Email Settings</span>
                </button>
            </div>

            {/* Email Settings Panel */}
            {showEmailSettings && (
                <GlassCard className="!p-4 sm:!p-5 border-l-4 border-l-brand-500 animate-slide-down">
                    <h3 className="font-bold text-gray-800 mb-2 sm:mb-3 text-sm">Manager Email Configuration</h3>
                    <p className="text-xs text-gray-500 mb-3 sm:mb-4 break-words">Set the email address that will receive approval requests when users click &quot;Send Email&quot;.</p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:max-w-md">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Email</label>
                            <input
                                type="email"
                                value={managerEmail}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setManagerEmail(e.target.value)}
                                className="input-field w-full"
                                placeholder="manager@company.com"
                            />
                        </div>
                        <button
                            onClick={saveSettings}
                            disabled={savingSettings || !managerEmail}
                            className="btn-primary py-2.5 px-6"
                        >
                            {savingSettings ? "Saving..." : "Save"}
                        </button>
                    </div>
                </GlassCard>
            )}

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto scrollbar-hide -mx-2 px-2 pb-2">
                <button
                    onClick={() => setActiveTab("requests")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === "requests" ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
                >
                    All Requests
                </button>
                <button
                    onClick={() => setActiveTab("analytics")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === "analytics" ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
                >
                    Data Analytics
                </button>
                <button
                    onClick={() => setActiveTab("roles")}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === "roles" ? "bg-brand-50 text-brand-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
                >
                    User Roles
                </button>
            </div>

            {/* Active Tab Content */}
            {activeTab === "analytics" && <AnalyticsTab requests={requests} />}
            {activeTab === "roles" && <UserRolesTab addToast={addToast} />}
            {activeTab === "requests" && (
                <>
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {Object.entries(STATUS_LABELS).map(([status, label]) => {
                    const count = requests.filter((r: RequestRecord) => r.status === status).length;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(filterStatus === status ? "" : status)}
                            className={`glass-card !p-3 text-center transition-all hover:scale-[1.02] ${filterStatus === status ? "ring-2 ring-brand-400" : ""}`}
                        >
                            <p className="text-lg sm:text-xl font-bold text-gray-800">{count}</p>
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
                    filteredRequests.map((req: RequestRecord) => {
                        const isExpanded = expandedRequest === req.id;
                        const reqLogs = getRequestLogs(req.id);

                        return (
                            <GlassCard key={req.id} className="!p-0 overflow-hidden">
                                {/* ─── Main Row ─── */}
                                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-brand-600">{req.event_id}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(req.status)}`}>
                                                {(STATUS_LABELS as Record<string, string>)[req.status] || req.status}
                                            </span>
                                            {req.approval_file_url && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                                    Signed
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 whitespace-normal break-words">{req.project_name || "No project"}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 break-words">
                                            THB {req.amount?.toLocaleString()} · {req.billing_type?.replace("_", " ")} · {fmtDate(req.created_at)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {/* Status Dropdown */}
                                        <select
                                            value={req.status}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(req.id, e.target.value)}
                                            disabled={statusUpdating === req.id}
                                            className="select-field !py-2 !px-3 text-xs w-auto min-w-[120px]"
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
                                                {req.approval_file_url ? "Replace" : "Attach"}
                                            </button>
                                        )}

                                        {req.approval_file_url && (
                                            <div className="flex gap-1.5 items-center">
                                                {!req.approval_file_url.startsWith("data-ref:") ? (
                                                    <a
                                                        href={`/api/requests/${req.id}/upload-approval`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
                                                        title="View Approval"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                        View
                                                    </a>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200 flex items-center" title="Upload failed">
                                                        Storage Missing
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Receipts */}
                                        <button
                                            onClick={() => { setSelectedRequest(req); setReceiptModalOpen(true); }}
                                            className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                        >
                                            Receipts
                                        </button>

                                        {/* Expand/Collapse */}
                                        <button
                                            onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
                                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${isExpanded ? "bg-brand-50 text-brand-600 border border-brand-200" : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                                            {isExpanded ? "Close" : "Details"}
                                        </button>

                                        {/* Delete */}
                                        <button
                                            onClick={() => handleDeleteRequest(req.id, req.event_id)}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                                            title="Delete Request"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* ─── Expanded Details ─── */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
                                        <div className="p-4 sm:p-6 space-y-5">

                                            {/* Row 1: Requester + Project */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Requester Info */}
                                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requester Info</h4>
                                                    </div>
                                                    <div className="p-4 space-y-2.5 text-sm">
                                                        <div className="flex flex-wrap justify-between gap-1">
                                                            <span className="text-gray-400 text-xs">Name</span>
                                                            <span className="font-medium text-gray-700 text-xs break-all text-right">{req.full_name || req.profiles?.name || "N/A"}</span>
                                                        </div>
                                                        <div className="flex flex-wrap justify-between gap-1">
                                                            <span className="text-gray-400 text-xs">Department</span>
                                                            <span className="font-medium text-gray-700 text-xs break-all text-right">{req.department || req.profiles?.department || "N/A"}</span>
                                                        </div>
                                                        <div className="flex flex-wrap justify-between gap-1">
                                                            <span className="text-gray-400 text-xs">Email</span>
                                                            <span className="font-medium text-gray-700 text-xs break-all text-right">{req.email || "N/A"}</span>
                                                        </div>
                                                        <div className="flex flex-wrap justify-between gap-1">
                                                            <span className="text-gray-400 text-xs">Contact</span>
                                                            <span className="font-medium text-gray-700 text-xs break-all text-right">{req.contact_no || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Project Details */}
                                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Project Details</h4>
                                                    </div>
                                                    <div className="p-4 space-y-2.5 text-sm">
                                                        <div>
                                                            <span className="text-gray-400 text-xs block">Project Name</span>
                                                            <p className="font-medium text-gray-700 text-xs break-words mt-0.5">{req.project_name || "N/A"}</p>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-gray-400 text-xs block">Amount</span>
                                                                <p className="font-semibold text-brand-600 text-sm mt-0.5">THB {req.amount?.toLocaleString()}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400 text-xs block">Billing</span>
                                                                <p className="font-medium text-gray-700 text-xs mt-0.5">{req.billing_type?.replace("_", " ") || "N/A"}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-gray-400 text-xs block">Start Date</span>
                                                                <p className="font-medium text-gray-700 text-xs mt-0.5">{fmtDate(req.start_date)}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-gray-400 text-xs block">End Date</span>
                                                                <p className="font-medium text-gray-700 text-xs mt-0.5">{fmtDate(req.end_date)}</p>
                                                            </div>
                                                        </div>
                                                        {(req.booking_date || req.effective_date) && (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <span className="text-gray-400 text-xs block">Booking Date</span>
                                                                    <p className="font-medium text-gray-700 text-xs mt-0.5">{fmtDate(req.booking_date)}</p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-400 text-xs block">Effective Date</span>
                                                                    <p className="font-medium text-gray-700 text-xs mt-0.5">{fmtDate(req.effective_date)}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Row 2: Objective */}
                                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Objective</h4>
                                                </div>
                                                <div className="p-4">
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{req.objective || "No objective specified"}</p>
                                                </div>
                                            </div>

                                            {/* Row 3: Approval Notes (if any) */}
                                            {req.approval_notes && (
                                                <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                                                        <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Approval Notes</h4>
                                                    </div>
                                                    <div className="p-4">
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">{req.approval_notes}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Row 4: Promotional Channels */}
                                            {req.promotional_channels && req.promotional_channels.length > 0 && (
                                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Promotional Channels ({req.promotional_channels.length})</h4>
                                                    </div>
                                                    <div className="p-4">
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {req.promotional_channels.map((chan: { channel: string; mediaAccountEmail: string; accessList: string }, idx: number) => (
                                                                <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                                                                    <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 flex justify-between items-center">
                                                                        <span className="break-words">{chan.channel}</span>
                                                                        <span className="text-[10px] text-gray-400 font-normal flex-shrink-0 ml-2">#{idx + 1}</span>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div>
                                                                            <span className="text-gray-400">Account: </span>
                                                                            <span className="text-gray-700 font-medium break-all">{chan.mediaAccountEmail || "N/A"}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-gray-400">Access: </span>
                                                                            <span className="text-gray-700 font-medium break-all">{chan.accessList || "N/A"}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Row 5: Approval File Preview */}
                                            {req.approval_file_url && (
                                                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Signed Approval Document</h4>
                                                    </div>
                                                    <div className="p-4 flex items-center gap-4 flex-wrap">
                                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-purple-600 text-lg font-bold">✓</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-700 break-words">
                                                                {req.approval_file_url.startsWith("data-ref:") ? req.approval_file_url.replace("data-ref:", "") : "Approval Document"}
                                                            </p>
                                                            <p className="text-xs text-gray-400">Signed approval file</p>
                                                        </div>
                                                        {!req.approval_file_url.startsWith("data-ref:") && (
                                                            <a
                                                                href={req.approval_file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors flex-shrink-0"
                                                            >
                                                                View / Download
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Row 6: Activity Timeline (Audit Logs) */}
                                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activity Timeline ({reqLogs.length})</h4>
                                                </div>
                                                <div className="p-4">
                                                    {reqLogs.length === 0 ? (
                                                        <p className="text-xs text-gray-400 text-center py-4">No activity recorded</p>
                                                    ) : (
                                                        <div className="relative">
                                                            {/* Timeline line */}
                                                            <div className="absolute left-3 top-3 bottom-3 w-px bg-gray-200" />
                                                            <div className="space-y-3">
                                                                {reqLogs.map((log: AuditLog) => (
                                                                    <div key={log.id} className="flex items-start gap-3 relative">
                                                                        {/* Dot */}
                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 relative z-10 ${getActionColor(log.action)}`}>
                                                                            {getActionIcon(log.action)}
                                                                        </div>
                                                                        {/* Content */}
                                                                        <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getActionColor(log.action)}`}>
                                                                                    {log.action}
                                                                                </span>
                                                                                <span className="text-[10px] text-gray-400">
                                                                                    {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-xs text-gray-600 break-words whitespace-pre-wrap">
                                                                                <span className="font-medium">{log.user_name || "System"}</span>
                                                                                {" — "}
                                                                                {describeAuditChange(log.action, log.changes)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Row 7: Sub-Project Allocation */}
                                            <SubProjectAllocation
                                                requestId={req.id}
                                                totalAmount={req.amount}
                                                isApproved={req.status === "APPROVED"}
                                                addToast={addToast}
                                            />
                                        </div>
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })
                )}
            </div>
                </>
            )}

            {/* Modals */}
            <ApprovalUploadModal
                isOpen={approvalModalOpen}
                onClose={() => { setApprovalModalOpen(false); setSelectedRequest(null); }}
                requestId={selectedRequest?.id || null}
                eventId={selectedRequest?.event_id || ""}
                onSuccess={() => { fetchData(); addToast("Approval file uploaded successfully!", "success"); }}
            />
            <ReceiptUploadModal
                isOpen={receiptModalOpen}
                onClose={() => { setReceiptModalOpen(false); setSelectedRequest(null); fetchData(); }}
                request={selectedRequest}
            />
        </div>
    );
}
