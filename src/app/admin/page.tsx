"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ApprovalUploadModal } from "@/components/dashboard/ApprovalUploadModal";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { RequestRecord, AuditLog, STATUS_LABELS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { UserRolesTab } from "@/components/admin/UserRolesTab";
import AdminRequestRow from "@/components/admin/AdminRequestRow";
import { getStatusColor } from "@/lib/admin-utils";

/**
 * AdminPage Component
 * 
 * This is the main container for the Admin Dashboard. It fetches requests and audit logs
 * from the Next.js API route (/api/requests and /api/audit-logs) when it loads.
 * It also manages global state such as which tab is active, the email settings, and toast notifications.
 */
export default function AdminPage() {
    // ---- State Management ----
    // We use React state to track the active tab, the data fetched from the API, and any loading/error states.
    const [activeTab, setActiveTab] = useState<"requests" | "analytics" | "roles">("requests");
    const [requests, setRequests] = useState<RequestRecord[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("");
    const [currentUserRole, setCurrentUserRole] = useState<string>("");
    
    // Modal & Row tracking
    const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
    const [approvalModalOpen, setApprovalModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

    // Email Settings State
    const [showEmailSettings, setShowEmailSettings] = useState(false);
    const [managerEmail, setManagerEmail] = useState("");
    const [savingSettings, setSavingSettings] = useState(false);

    // Toast (Notification) State
    const [toasts, setToasts] = useState<{ id: string; message: string; severity: AlertSeverity }[]>([]);

    /** Adds a disappearing popup notification */
    const addToast = (message: string, severity: AlertSeverity = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, severity }]);
        setTimeout(() => removeToast(id), 5000); // 5 seconds later
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    // ---- Data Fetching ----
    const fetchUser = async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                setCurrentUserRole(data.user?.role || "");
            }
        } catch {}
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
            addToast("Failed to fetch data from server", "error");
        } finally {
            setLoading(false);
        }
    };

    // useEffect runs our data-fetching logic exactly once when the component is first rendered to the screen.
    useEffect(() => {
        fetchData();
        fetchSettings();
        fetchUser();
    }, []);

    // ---- Event Handlers ----
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
                await fetchData(); // Refresh the data to show new statuses/logs
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
        // Built-in browser confirmation prompt
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

    // ---- Filter Logic ----
    // If a filter is active, only show requests matching that status.
    const filteredRequests = filterStatus
        ? requests.filter((r: RequestRecord) => r.status === filterStatus)
        : requests;

    const getRequestLogs = (requestId: string) =>
        logs.filter((l: AuditLog) => l.entity_id === requestId);

    /* ── Render Loading Screen ── */
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

    /* ── Render Main UI ── */
    return (
        <div className="space-y-6 relative">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header Area */}
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

            {/* Hidden Panel: Email Settings */}
            {showEmailSettings && (
                <GlassCard className="!p-4 sm:!p-5 border-l-4 border-l-brand-500 animate-slide-down">
                    <h3 className="font-bold text-gray-800 mb-2 sm:mb-3 text-sm">Manager Email Configuration</h3>
                    <p className="text-xs text-gray-500 mb-3 sm:mb-4 break-words">Set the email address that will receive approval requests when users click "Send Email".</p>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:max-w-md">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Email</label>
                            <input
                                type="email"
                                value={managerEmail}
                                onChange={(e) => setManagerEmail(e.target.value)}
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

            {/* Tab Navigation Menu */}
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

            {/* Tab Switching Body */}
            {activeTab === "analytics" && <AnalyticsTab requests={requests} />}
            {activeTab === "roles" && <UserRolesTab addToast={addToast} />}
            {activeTab === "requests" && (
                <>
                    {/* KPI Summary Row (Clickable to Filter) */}
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

                    {/* Extracted Requests List Mapper */}
                    <div className="space-y-3">
                        {filteredRequests.length === 0 ? (
                            <GlassCard className="text-center py-12">
                                <p className="text-gray-400">No requests found</p>
                            </GlassCard>
                        ) : (
                            filteredRequests.map((req: RequestRecord) => (
                                <AdminRequestRow
                                    key={req.id}
                                    role={currentUserRole}
                                    req={req}
                                    reqLogs={getRequestLogs(req.id)}
                                    isExpanded={expandedRequest === req.id}
                                    statusUpdating={statusUpdating}
                                    handleStatusChange={handleStatusChange}
                                    handleDeleteRequest={handleDeleteRequest}
                                    setSelectedRequest={setSelectedRequest}
                                    setApprovalModalOpen={setApprovalModalOpen}
                                    setReceiptModalOpen={setReceiptModalOpen}
                                    setExpandedRequest={setExpandedRequest}
                                    addToast={addToast}
                                />
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Global Modals overlaying the page */}
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
