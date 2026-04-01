"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApprovalUploadModal } from "@/components/dashboard/ApprovalUploadModal";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { RequestRecord, AuditLog, STATUS_LABELS } from "@/lib/types";
import { ToastContainer, AlertSeverity } from "@/components/ui/MuiAlert";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { UserRolesTab } from "@/components/admin/UserRolesTab";
import AdminRequestRow from "@/components/admin/AdminRequestRow";
import { getStatusColor } from "@/lib/admin-utils";
import { Settings, Mail, ListFilter, BarChart3, Users, Loader2, Plus, Download, Trash2, ChevronDown, CheckCircle2, Search, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" => {
    switch (status) {
        case "APPROVED":
        case "COMPLETED":
        case "ACTIVE":
            return "success";
        case "PENDING_APPROVAL":
        case "PENDING":
            return "warning";
        case "CANCELLED":
        case "REJECTED":
            return "destructive";
        case "DRAFT":
            return "secondary";
        default:
            return "info";
    }
};

export default function AdminPage() {
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

    const addToast = (message: string, severity: AlertSeverity = "info") => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, severity }]);
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

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

    useEffect(() => {
        fetchData();
        fetchSettings();
        fetchUser();
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

    const handleDeleteRequest = async (requestId: string, reqId: string) => {
        if (!window.confirm(`Are you sure you want to delete request ${reqId}? This action cannot be undone.`)) {
            return;
        }
        try {
            const res = await fetch(`/api/requests/${requestId}`, { method: "DELETE" });
            if (res.ok) {
                addToast(`Request ${reqId} deleted successfully`, "success");
                await fetchData();
            } else {
                const data = await res.json();
                addToast(data.error || "Failed to delete request", "error");
            }
        } catch {
            addToast("Network error deleting request", "error");
        }
    };

    const filteredRequests = filterStatus
        ? requests.filter((r: RequestRecord) => r.status === filterStatus)
        : requests;

    const getRequestLogs = (requestId: string) =>
        logs.filter((l: AuditLog) => l.entity_id === requestId);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4 animate-in fade-in duration-500">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Syncing Admin Records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            {/* Header section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">
                        Admin <span className="gradient-text">Panel</span>
                    </h1>
                    <p className="text-muted-foreground max-w-lg">Manage corporate card lifecycle, track usage analytics, and configure system permissions.</p>
                </div>
                <Button 
                    variant={showEmailSettings ? "brand" : "outline"}
                    className="shadow-sm transition-all duration-300"
                    onClick={() => setShowEmailSettings(!showEmailSettings)}
                >
                    <Settings className={cn("w-4 h-4 mr-2 transition-transform duration-500", showEmailSettings && "rotate-90")} />
                    Email Configuration
                </Button>
            </div>

            {/* Email Settings Panel */}
            {showEmailSettings && (
                <Card glass className="border-brand-100 bg-brand-50/10 shadow-lg animate-in zoom-in-95 duration-300">
                    <CardHeader className="pb-3 border-b border-brand-100/50">
                        <CardTitle className="text-sm font-bold flex items-center text-brand-700">
                            <Mail className="w-4 h-4 mr-2" />
                            Global Notification Recipient
                        </CardTitle>
                        <CardDescription>
                            Approval requests will be routed to this address for final manager verification.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-end max-w-2xl">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="managerEmail" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manager Email Address</Label>
                                <Input 
                                    id="managerEmail"
                                    type="email" 
                                    placeholder="approver@company.com" 
                                    className="bg-white/80 border-brand-200"
                                    value={managerEmail}
                                    onChange={(e) => setManagerEmail(e.target.value)}
                                />
                            </div>
                            <Button 
                                variant="brand" 
                                className="px-8 shadow-brand/20"
                                onClick={saveSettings}
                                disabled={savingSettings || !managerEmail}
                            >
                                {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {savingSettings ? "Updating..." : "Save Settings"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Tabs Navigation */}
            <div className="flex p-1.5 bg-gray-100/50 backdrop-blur-sm rounded-2xl w-fit border border-gray-200/50">
                <Button 
                    variant="ghost" 
                    className={cn("px-6 h-10 rounded-xl text-xs font-bold transition-all", activeTab === "requests" ? "bg-white text-brand-700 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-800")}
                    onClick={() => setActiveTab("requests")}
                >
                    <ListFilter className="w-3.5 h-3.5 mr-2" />
                    All Requests
                </Button>
                <Button 
                    variant="ghost" 
                    className={cn("px-6 h-10 rounded-xl text-xs font-bold transition-all", activeTab === "analytics" ? "bg-white text-brand-700 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-800")}
                    onClick={() => setActiveTab("analytics")}
                >
                    <BarChart3 className="w-3.5 h-3.5 mr-2" />
                    Analytics Insight
                </Button>
                <Button 
                    variant="ghost" 
                    className={cn("px-6 h-10 rounded-xl text-xs font-bold transition-all", activeTab === "roles" ? "bg-white text-brand-700 shadow-sm border border-gray-100" : "text-gray-500 hover:text-gray-800")}
                    onClick={() => setActiveTab("roles")}
                >
                    <Users className="w-3.5 h-3.5 mr-2" />
                    Security & Roles
                </Button>
            </div>

            {/* Tab Contents */}
            <div className="min-h-[400px]">
                {activeTab === "analytics" && <AnalyticsTab requests={requests} />}
                {activeTab === "roles" && <UserRolesTab addToast={addToast} />}
                {activeTab === "requests" && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Summary KPI Pills */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {Object.entries(STATUS_LABELS).map(([status, label]) => {
                                const count = requests.filter((r: RequestRecord) => r.status === status).length;
                                const isActive = filterStatus === status;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(isActive ? "" : status)}
                                        className={cn(
                                            "group p-4 rounded-3xl transition-all duration-300 border text-center relative overflow-hidden",
                                            isActive 
                                                ? "bg-white border-brand-200 shadow-xl shadow-brand/5 scale-[1.02]" 
                                                : "bg-gray-50/50 border-gray-100/50 hover:bg-white hover:border-brand-100 hover:shadow-lg"
                                        )}
                                    >
                                        {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-brand-500" />}
                                        <p className={cn("text-2xl font-black mb-1 transition-colors", isActive ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600")}>
                                            {count}
                                        </p>
                                        <Badge variant={getStatusVariant(status)} className="text-[9px] uppercase tracking-wider font-bold h-5 px-2">
                                            {label}
                                        </Badge>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Request List */}
                        <div className="space-y-4">
                            {filteredRequests.length === 0 ? (
                                <Card glass className="py-20 flex flex-col items-center justify-center border-dashed border-2">
                                    <Search className="w-12 h-12 text-gray-200 mb-4" />
                                    <p className="text-muted-foreground font-medium">No records match your current filter</p>
                                    <Button variant="link" size="sm" onClick={() => setFilterStatus("")} className="mt-2 text-brand-600">Clear all filters</Button>
                                </Card>
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
                    </div>
                )}
            </div>

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
