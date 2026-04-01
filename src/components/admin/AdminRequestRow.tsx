import { RequestRecord, AuditLog, STATUS_LABELS } from "@/lib/types";
import { fmtDate } from "@/lib/admin-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    ChevronDown, 
    Eye, 
    Paperclip, 
    Receipt, 
    Trash2, 
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText
} from "lucide-react";
import ExpandedRequestDetails from "./ExpandedRequestDetails";
import { cn } from "@/lib/utils";

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
        <Card glass className="overflow-hidden border-none shadow-md hover:shadow-lg transition-all duration-300">
            {/* ─── Main Row ─── */}
            <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Info Block */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-[10px] py-0 px-2 bg-white/50">
                            {req.req_id || req.event_id}
                        </Badge>
                        {req.event_id && (
                            <Badge variant="secondary" className="text-[9px] font-bold h-5">
                                Event: {req.event_id}
                                {req.event_details && req.event_details.length > 1 && (
                                    <span className="ml-1 opacity-60 font-normal">(+{req.event_details.length - 1})</span>
                                )}
                            </Badge>
                        )}
                        <Badge variant={getStatusVariant(req.status)} className="h-5 text-[10px]">
                            {(STATUS_LABELS as Record<string, string>)[req.status] || req.status}
                        </Badge>
                        {req.approval_file_url && (
                            <Badge variant="info" className="bg-indigo-50 text-indigo-700 border-indigo-100 italic h-5 text-[10px]">
                                Signed
                            </Badge>
                        )}
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 truncate mb-1">
                        {req.project_name || "Untitled Project"}
                    </h4>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium">
                        <span className="text-brand-600 font-bold">THB {req.amount?.toLocaleString()}</span>
                        <span className="opacity-30">•</span>
                        <span>{req.billing_type?.replace("_", " ")}</span>
                        <span className="opacity-30">•</span>
                        <span>{fmtDate(req.created_at)}</span>
                    </div>
                </div>

                {/* Actions Block */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Status Dropdown - Styled to match shadcn */}
                    <div className="relative">
                        <select
                            value={req.status}
                            onChange={(e) => handleStatusChange(req.id, e.target.value)}
                            disabled={statusUpdating === req.id}
                            className={cn(
                                "h-9 w-[160px] rounded-md border border-input bg-white/50 px-3 py-1 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8",
                                statusUpdating === req.id && "animate-pulse"
                            )}
                        >
                            {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 opacity-50 pointer-events-none" />
                    </div>

                    {/* Quick Access Actions */}
                    <div className="flex items-center gap-1.5 p-1 bg-gray-100/50 rounded-lg border border-gray-200/50">
                        {req.status === "PENDING_APPROVAL" && (
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 px-2.5 text-[10px] bg-white border-brand-100 text-brand-600 hover:bg-brand-50"
                                onClick={() => { setSelectedRequest(req); setApprovalModalOpen(true); }}
                            >
                                <Paperclip className="w-3 h-3 mr-1.5" />
                                {req.approval_file_url ? "Replace" : "Attach File"}
                            </Button>
                        )}

                        {req.approval_file_url && (
                            <div className="flex items-center">
                                {!req.approval_file_url.startsWith("data-ref:") ? (
                                    <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                        <a href={`/api/requests/${req.id}/upload-approval`} target="_blank" rel="noopener noreferrer">
                                            <Eye className="w-3 h-3 mr-1" />
                                            View
                                        </a>
                                    </Button>
                                ) : (
                                    <Badge variant="destructive" className="h-6 text-[9px] rounded px-1.5 flex gap-1">
                                        <AlertCircle className="w-2.5 h-2.5" />
                                        MIA
                                    </Badge>
                                )}
                            </div>
                        )}

                        <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 px-2.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => { setSelectedRequest(req); setReceiptModalOpen(true); }}
                        >
                            <Receipt className="w-3 h-3 mr-1.5" />
                            Receipts
                        </Button>

                        <div className="w-px h-4 bg-gray-200 mx-1" />

                        <Button 
                            size="sm" 
                            variant={isExpanded ? "brand" : "ghost"}
                            className={cn("h-7 px-2.5 text-[10px]", !isExpanded && "text-gray-500 hover:text-gray-700 hover:bg-gray-200")}
                            onClick={() => setExpandedRequest(isExpanded ? null : req.id)}
                        >
                            <FileText className={cn("w-3 h-3 mr-1.5 transition-transform", isExpanded && "rotate-5")} />
                            {isExpanded ? "Hide" : "Details"}
                        </Button>
                    </div>

                    {/* Dangerous Actions */}
                    {role !== "manager" && (
                        <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-9 w-9 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteRequest(req.id, req.req_id || req.event_id || "N/A")}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* ─── Expanded Details ─── */}
            {isExpanded && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                    <ExpandedRequestDetails req={req} reqLogs={reqLogs} addToast={addToast} />
                </div>
            )}
        </Card>
    );
}
