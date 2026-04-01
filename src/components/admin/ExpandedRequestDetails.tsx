import { RequestRecord, AuditLog } from "@/lib/types";
import { describeAuditChange, fmtDate, getActionColor, getActionIcon } from "@/lib/admin-utils";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { InfoCard, DetailItem, DetailGrid } from "@/components/ui/DataDisplay";
import { AuditAction, RequestStatus } from "@/types/enums";

interface ExpandedRequestDetailsProps {
    req: RequestRecord;
    reqLogs: AuditLog[];
    addToast: (message: string, severity: "success" | "error" | "info" | "warning") => void;
}

/**
 * Renders the detailed "Expanded" view of a single request.
 * Organized into logical sections using the atomic DataDisplay system.
 */
export default function ExpandedRequestDetails({ req, reqLogs, addToast }: ExpandedRequestDetailsProps) {
    const eventDetails = (req.event_details as any[]) || [];
    const promotionalChannels = req.promotional_channels || [];

    return (
        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white dark:from-gray-900 dark:to-gray-800">
            <div className="p-4 sm:p-6 space-y-6">
                
                {/* Section 1: Basic Information */}
                <DetailGrid cols={2}>
                    <InfoCard title="Requester Info">
                        <div className="space-y-1">
                            <DetailItem label="Name" value={req.full_name || req.profiles?.name} />
                            <DetailItem label="Department" value={req.department || req.profiles?.department} />
                            <DetailItem label="Email" value={req.email} />
                            <DetailItem label="Contact" value={req.contact_no} />
                        </div>
                    </InfoCard>

                    <InfoCard title="Project Details">
                        <div className="space-y-1">
                            <DetailItem label="Project Name" value={req.project_name} />
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <DetailItem label="Amount" value={`THB ${req.amount?.toLocaleString()}`} horizontal={false} />
                                <DetailItem label="Billing" value={req.billing_type?.replace("_", " ")} horizontal={false} />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <DetailItem label="Start Date" value={fmtDate(req.start_date)} horizontal={false} />
                                <DetailItem label="End Date" value={fmtDate(req.end_date)} horizontal={false} />
                            </div>
                        </div>
                    </InfoCard>
                </DetailGrid>

                {/* Section 2: Events & Financials */}
                <InfoCard title="Events & Accounts">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {eventDetails.length > 0 ? (
                            eventDetails.map((ed, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs">
                                        <span>Event #{idx + 1}</span>
                                        <span className="font-mono text-[10px] text-gray-400">ID: {ed.reqId || ed.eventId}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400 uppercase text-[10px] font-bold">Account Code</span>
                                        <span className="font-mono font-bold text-gray-700 dark:text-gray-200 text-xs">{ed.accountCode}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs">
                                    <span>Event</span>
                                    <span className="font-mono text-[10px] text-gray-400">ID: {req.event_id || "N/A"}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 uppercase text-[10px] font-bold">Account Code</span>
                                    <span className="font-mono font-bold text-gray-700 dark:text-gray-200 text-xs">{req.account_code || "N/A"}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    {req.credit_card_no && (
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center px-1">
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-tight">Corporate Card Number</span>
                            <span className="text-sm font-mono font-bold text-brand-600 tracking-wider font-semibold">{req.credit_card_no}</span>
                        </div>
                    )}
                </InfoCard>

                {/* Section 3: Objective & Notes */}
                <DetailGrid cols={req.approval_notes ? 2 : 1}>
                    <InfoCard title="Objective">
                        <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                            {req.objective || "No objective specified"}
                        </p>
                    </InfoCard>
                    {req.approval_notes && (
                      <InfoCard title="Approval Notes" headerClassName="bg-amber-50 dark:bg-amber-900/20" className="border-amber-100 dark:border-amber-900/30">
                          <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                              {req.approval_notes}
                          </p>
                      </InfoCard>
                    )}
                </DetailGrid>

                {/* Section 4: Promotional Channels */}
                {promotionalChannels.length > 0 && (
                    <InfoCard title={`Promotional Channels (${promotionalChannels.length})`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {promotionalChannels.map((chan, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700 text-xs">
                                    <div className="font-bold text-brand-600 mb-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="break-words">{chan.channel}</span>
                                        <span className="text-[10px] text-gray-400 font-normal">#{idx + 1}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Account: </span>
                                            <span className="text-gray-700 dark:text-gray-200 font-medium truncate ml-2">{chan.mediaAccountEmail || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Access: </span>
                                            <span className="text-gray-700 dark:text-gray-200 font-medium truncate ml-2">{chan.accessList || "N/A"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </InfoCard>
                )}

                {/* Section 5: Files & Documentation */}
                {req.approval_file_url && (
                    <InfoCard title="Documentation">
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                                <span className="text-purple-600 dark:text-purple-400 text-lg font-bold">📄</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                    {req.approval_file_url.startsWith("data-ref:") ? req.approval_file_url.replace("data-ref:", "") : "Signed Approval Document"}
                                </p>
                                <p className="text-xs text-gray-400">Official backup of the approved form</p>
                            </div>
                            {!req.approval_file_url.startsWith("data-ref:") && (
                                <a
                                    href={req.approval_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 hover:bg-brand-100 transition-colors"
                                >
                                    View Document
                                </a>
                            )}
                        </div>
                    </InfoCard>
                )}

                {/* Section 6: Audit Timeline */}
                <InfoCard title={`Activity Timeline (${reqLogs.length})`}>
                    {reqLogs.length === 0 ? (
                        <p className="text-xs text-center py-6 text-gray-400 italic">No activity recorded yet</p>
                    ) : (
                        <div className="relative pl-6 space-y-4">
                            <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />
                            {reqLogs.map((log: AuditLog) => (
                                <div key={log.id} className="relative">
                                    <div className={`absolute -left-[21px] top-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 ${getActionColor(log.action)}`}>
                                        {getActionIcon(log.action)}
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700 hover:border-brand-200 transition-colors">
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                            <span className="text-[10px] font-mono text-gray-400 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">{log.user_name || "System"}</span>
                                            <span className="mx-2 opacity-50">•</span>
                                            {describeAuditChange(log.action, log.changes)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </InfoCard>

                {/* Section 7: Financial Allocations */}
                <SubProjectAllocation
                    requestId={req.id}
                    totalAmount={req.amount}
                    isApproved={req.status === RequestStatus.APPROVED}
                    addToast={addToast}
                />
            </div>
        </div>
    );
}


