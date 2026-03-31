import { RequestRecord, AuditLog } from "@/lib/types";
import { describeAuditChange, fmtDate, getActionColor, getActionIcon } from "@/lib/admin-utils";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";

interface ExpandedRequestDetailsProps {
    req: RequestRecord;
    reqLogs: AuditLog[];
    addToast: (message: string, severity: "success" | "error" | "info" | "warning") => void;
}

/**
 * Renders the heavily detailed "Expanded" view of a single request.
 * Extracted here to keep the main page component strictly focused on layout.
 */
export default function ExpandedRequestDetails({ req, reqLogs, addToast }: ExpandedRequestDetailsProps) {
    return (
        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
            <div className="p-4 sm:p-6 space-y-5">
                {/* Row 1: Requester + Project */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Requester Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Requester Info</h4>
                        </div>
                        <div className="p-4 space-y-2.5 text-sm">
                            <div className="flex flex-wrap justify-between gap-1">
                                <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">Name</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-xs break-all text-right">{req.full_name || req.profiles?.name || "N/A"}</span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-1">
                                <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">Department</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-xs break-all text-right">{req.department || req.profiles?.department || "N/A"}</span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-1">
                                <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">Email</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-xs break-all text-right">{req.email || "N/A"}</span>
                            </div>
                            <div className="flex flex-wrap justify-between gap-1">
                                <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs">Contact</span>
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-xs break-all text-right">{req.contact_no || "N/A"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Project Details */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Project Details</h4>
                        </div>
                        <div className="p-4 space-y-2.5 text-sm">
                            <div>
                                <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs block">Project Name</span>
                                <p className="font-medium text-gray-700 dark:text-gray-200 text-xs break-words mt-0.5">{req.project_name || "N/A"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs block">Amount</span>
                                    <p className="font-semibold text-brand-600 text-sm mt-0.5">THB {req.amount?.toLocaleString()}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs block">Billing</span>
                                    <p className="font-medium text-gray-700 dark:text-gray-200 text-xs mt-0.5">{req.billing_type?.replace("_", " ") || "N/A"}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs block">Start Date</span>
                                    <p className="font-medium text-gray-700 dark:text-gray-200 text-xs mt-0.5">{fmtDate(req.start_date)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs block">End Date</span>
                                    <p className="font-medium text-gray-700 dark:text-gray-200 text-xs mt-0.5">{fmtDate(req.end_date)}</p>
                                </div>
                            </div>
                            {(req.booking_date || req.effective_date) && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs block">Booking Date</span>
                                        <p className="font-medium text-gray-700 dark:text-gray-200 text-xs mt-0.5">{fmtDate(req.booking_date)}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-xs block">Effective Date</span>
                                        <p className="font-medium text-gray-700 dark:text-gray-200 text-xs mt-0.5">{fmtDate(req.effective_date)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Event & Account Details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Events & Accounts</h4>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {(req.event_details && (req.event_details as any).length > 0) ? (
                                (req.event_details as any).map((ed: any, idx: number) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 text-xs">
                                        <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 flex justify-between items-center">
                                            <span>Event #{idx + 1}</span>
                                            <span className="font-mono text-[10px] text-gray-400">ID: {ed.reqId || ed.eventId}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400 uppercase text-[10px] font-bold">Account Code</span>
                                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{ed.accountCode}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 text-xs">
                                    <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 flex justify-between items-center">
                                        <span>Event</span>
                                        <span className="font-mono text-[10px] text-gray-400">ID: {req.event_id || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Account Code</span>
                                        <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{req.account_code || "N/A"}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        {req.credit_card_no && (
                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center px-1">
                                <span className="text-xs text-gray-400 uppercase font-bold tracking-tight">Corporate Card Number</span>
                                <span className="text-sm font-mono font-bold text-brand-600">{req.credit_card_no}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Objective */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Objective</h4>
                    </div>
                    <div className="p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{req.objective || "No objective specified"}</p>
                    </div>
                </div>

                {/* Row 3: Approval Notes (if any) */}
                {req.approval_notes && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                            <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Approval Notes</h4>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{req.approval_notes}</p>
                        </div>
                    </div>
                )}

                {/* Row 4: Promotional Channels */}
                {req.promotional_channels && req.promotional_channels.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Promotional Channels ({req.promotional_channels.length})</h4>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {req.promotional_channels.map((chan: { channel: string; mediaAccountEmail: string; accessList: string }, idx: number) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 text-xs">
                                        <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 flex justify-between items-center">
                                            <span className="break-words">{chan.channel}</span>
                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-normal flex-shrink-0 ml-2">#{idx + 1}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <div>
                                                <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Account: </span>
                                                <span className="text-gray-700 dark:text-gray-200 font-medium break-all">{chan.mediaAccountEmail || "N/A"}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Access: </span>
                                                <span className="text-gray-700 dark:text-gray-200 font-medium break-all">{chan.accessList || "N/A"}</span>
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Signed Approval Document</h4>
                        </div>
                        <div className="p-4 flex items-center gap-4 flex-wrap">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-600 text-lg font-bold">โ“</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words">
                                    {req.approval_file_url.startsWith("data-ref:") ? req.approval_file_url.replace("data-ref:", "") : "Approval Document"}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">Signed approval file</p>
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
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100">
                        <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider">Activity Timeline ({reqLogs.length})</h4>
                    </div>
                    <div className="p-4">
                        {reqLogs.length === 0 ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 text-center py-4">No activity recorded</p>
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
                                            <div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getActionColor(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                                                        {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap">
                                                    <span className="font-medium">{log.user_name || "System"}</span>
                                                    {" โ€” "}
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
    );
}

