import { RequestRecord, AuditLog, STATUS_LABELS } from "@/lib/types";
import { getStatusColor, fmtDate } from "@/lib/admin-utils";
import { GlassCard } from "@/components/ui/GlassCard";
import ExpandedRequestDetails from "./ExpandedRequestDetails";

interface AdminRequestRowProps {
    role?: string;
    req: RequestRecord;
    reqLogs: AuditLog[];
    isExpanded: boolean;
    statusUpdating: string | null;
    handleStatusChange: (requestId: string, newStatus: string) => Promise<void>;
    handleDeleteRequest: (requestId: string, reqId: string) => Promise<void>;
    setSelectedRequest: (req: RequestRecord) => void;
    setApprovalModalOpen: (open: boolean) => void;
    setReceiptModalOpen: (open: boolean) => void;
    setExpandedRequest: (id: string | null) => void;
    addToast: (message: string, severity: "success" | "error" | "info" | "warning") => void;
}

/**
 * Renders a single row in the Admin Dashboard representing one request.
 * Clicking "Details" drops down the `ExpandedRequestDetails` component.
 */
export default function AdminRequestRow({
    role,
    req,
    reqLogs,
    isExpanded,
    statusUpdating,
    handleStatusChange,
    handleDeleteRequest,
    setSelectedRequest,
    setApprovalModalOpen,
    setReceiptModalOpen,
    setExpandedRequest,
    addToast
}: AdminRequestRowProps) {
    return (
        <GlassCard className="!p-0 overflow-hidden">
            {/* ─── Main Row ─── */}
            <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
                {/* Info Block */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-xs font-bold text-brand-600">
                            {req.req_id || req.event_id}
                        </span>
                        {req.event_id && (
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                Event: {req.event_id}
                                {req.event_details && req.event_details.length > 1 && (
                                    <span className="ml-0.5 text-gray-400 font-normal">(+{req.event_details.length - 1})</span>
                                )}
                            </span>
                        )}
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

                {/* Actions Block */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Dropdown */}
                    <select
                        value={req.status}
                        onChange={(e) => handleStatusChange(req.id, e.target.value)}
                        disabled={statusUpdating === req.id}
                        className="select-field !py-2 !px-3 text-xs w-auto min-w-[120px]"
                    >
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    {/* Upload Approval File Button */}
                    {req.status === "PENDING_APPROVAL" && (
                        <button
                            onClick={() => { setSelectedRequest(req); setApprovalModalOpen(true); }}
                            className="px-3 py-2 rounded-lg text-xs font-medium bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                        >
                            {req.approval_file_url ? "Replace" : "Attach"}
                        </button>
                    )}

                    {/* Approval File View Link */}
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

                    {/* Receipts Button */}
                    <button
                        onClick={() => { setSelectedRequest(req); setReceiptModalOpen(true); }}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    >
                        Receipts
                    </button>

                    {/* Expand/Collapse Details Button */}
                    <button
                        onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${isExpanded ? "bg-brand-50 text-brand-600 border border-brand-200" : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                        {isExpanded ? "Close" : "Details"}
                    </button>

                    {/* Delete Admin Button */}
                    {role !== "manager" && (
                        <button
                            onClick={() => handleDeleteRequest(req.id, req.req_id || req.event_id || "N/A")}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all"
                            title="Delete Request"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Expanded Details ─── */}
            {isExpanded && (
                <ExpandedRequestDetails req={req} reqLogs={reqLogs} addToast={addToast} />
            )}
        </GlassCard>
    );
}
