"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ApprovalUploadModal } from "@/components/dashboard/ApprovalUploadModal";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { RequestRecord, AuditLog, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";

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

export default function AdminPage() {
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
        setToasts((prev) => [...prev, { id, message, severity }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
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
            // ignore
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
            const res = await fetch(`/api/requests/${requestId}`, {
                method: "DELETE",
            });

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
        <div className="space-y-6 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-1">
                        Admin <span className="gradient-text">Panel</span>
                    </h1>
                    <p className="text-sm text-gray-500">
                        Manage all requests and review submissions
                    </p>
                </div>
                <button 
                    onClick={() => setShowEmailSettings(!showEmailSettings)} 
                    className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>Email Settings</span>
                </button>
            </div>

            {/* Email Settings Panel */}
            {showEmailSettings && (
                <GlassCard className="!p-5 border-l-4 border-l-brand-500 animate-slide-down">
                    <h3 className="font-bold text-gray-800 mb-3 text-sm">Manager Email Configuration</h3>
                    <p className="text-xs text-gray-500 mb-4">Set the email address that will receive approval requests when users click "Send Email".</p>
                    <div className="flex gap-3 items-end max-w-md">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Email</label>
                            <input 
                                type="email" 
                                value={managerEmail} 
                                onChange={(e) => setManagerEmail(e.target.value)} 
                                className="input-field" 
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
                    filteredRequests.map((req: RequestRecord) => {
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
                                                    Signed
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 whitespace-normal break-words">{req.project_name || "No project"}</p>
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
                                                {req.approval_file_url ? "Replace File" : "Attach File"}
                                            </button>
                                        )}

                                        {req.approval_file_url && (
                                             <div className="flex gap-1.5 align-middle">
                                                 {!req.approval_file_url.startsWith("data-ref:") ? (
                                                     <>
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
                                                     </>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200 flex items-center" title="Upload failed to save stream in storage bucket due to missing configurations on attempt">
                                                        Storage Missing
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Manage Receipts (Admin View) */}
                                        <button
                                            onClick={() => { setSelectedRequest(req); setReceiptModalOpen(true); }}
                                            className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                        >
                                            Receipts
                                        </button>

                                        {/* Expand/Collapse */}
                                        <button
                                            onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
                                            className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
                                        >
                                            {isExpanded ? " Close" : " Details"}
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteRequest(req.id, req.event_id)}
                                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                                            title="Delete Request"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M3 6h18" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <line x1="10" y1="11" x2="10" y2="17" />
                                                <line x1="14" y1="11" x2="14" y2="17" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>



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
                                                <div>
                                                    <span className="text-gray-400 text-xs">Contact Number</span>
                                                    <p className="font-medium text-gray-700">{req.contact_no || "N/A"}</p>
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

                                            {/* Promotional Channels */}
                                            {req.promotional_channels && req.promotional_channels.length > 0 && (
                                                <div>
                                                    <span className="text-gray-400 text-xs block mb-1">Promotional Channels</span>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {req.promotional_channels.map((chan: any, idx: number) => (
                                                            <div key={idx} className="bg-white p-2 rounded-lg border border-gray-100 text-xs shadow-sm">
                                                                <div className="font-bold text-brand-600 text-[11px] mb-0.5">{chan.channel}</div>
                                                                <div className="text-gray-500 text-[10px] flex justify-between gap-2 flex-wrap">
                                                                    <span>Acc: <span className="text-gray-700 font-medium">{chan.mediaAccountEmail}</span></span>
                                                                    <span>Access: <span className="text-gray-700 font-medium">{chan.accessList}</span></span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Approval File Preview */}
                                            {req.approval_file_url && (
                                                <div>
                                                    <span className="text-gray-400 text-xs block mb-2">Attached Approval Document</span>
                                                    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-purple-600 text-lg">V</span>
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
                                                addToast={addToast}
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
                onSuccess={() => { fetchData(); addToast("Approval file uploaded successfully!", "success"); }}
            />
            {/* Receipt Upload Modal (Admins can also view/manage) */}
            <ReceiptUploadModal
                isOpen={receiptModalOpen}
                onClose={() => { setReceiptModalOpen(false); setSelectedRequest(null); fetchData(); }}
                request={selectedRequest}
            />
        </div >
    );
}
