import { RequestRecord, AuditLog } from "@/lib/types";
import { describeAuditChange, fmtDate, getActionColor, getActionIcon } from "@/lib/admin-utils";
import SubProjectAllocation from "@/components/dashboard/SubProjectAllocation";
import { InfoCard, DetailItem, DetailGrid } from "@/components/ui/DataDisplay";
import { AuditAction, RequestStatus } from "@/types/enums";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    User, 
    Briefcase, 
    Calendar, 
    CreditCard, 
    Target, 
    MessageSquare, 
    Rss, 
    FileCheck, 
    History,
    ChevronRight,
    Activity,
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandedRequestDetailsProps {
    req: RequestRecord;
    reqLogs: AuditLog[];
    addToast: (message: string, severity: "success" | "error" | "info" | "warning") => void;
}

export default function ExpandedRequestDetails({ req, reqLogs, addToast }: ExpandedRequestDetailsProps) {
    const eventDetails = (req.event_details as any[]) || [];
    const promotionalChannels = req.promotional_channels || [];

    return (
        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white pb-8">
            <div className="p-4 sm:p-8 space-y-8 animate-in fade-in slide-in-from-top-2 duration-500">
                
                {/* Section 1: Top Level Info Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Card className="shadow-none border-gray-100 bg-white/50">
                        <CardHeader className="py-3 px-4 bg-gray-50/50 border-b flex flex-row items-center space-y-0">
                            <User className="w-4 h-4 mr-2 text-brand-600" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Applicant Profile</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <DetailItem label="Full Name" value={req.full_name || req.profiles?.name} />
                            <DetailItem label="Department" value={req.department || req.profiles?.department} />
                            <DetailItem label="Email Account" value={req.email} />
                            <DetailItem label="Contact Mobile" value={req.contact_no} />
                        </CardContent>
                    </Card>

                    <Card className="shadow-none border-gray-100 bg-white/50">
                        <CardHeader className="py-3 px-4 bg-gray-50/50 border-b flex flex-row items-center space-y-0">
                            <Briefcase className="w-4 h-4 mr-2 text-brand-600" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Project</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <DetailItem label="Project Name" value={req.project_name} />
                            <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-gray-50">
                                <DetailItem label="Total Budget" value={`THB ${req.amount?.toLocaleString()}`} horizontal={false} />
                                <DetailItem label="Billing Cycle" value={req.billing_type?.replace("_", " ")} horizontal={false} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <DetailItem label="Launch Date" value={fmtDate(req.start_date)} horizontal={false} />
                                <DetailItem label="End Date" value={fmtDate(req.end_date)} horizontal={false} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Section 2: Events & Financials */}
                <Card className="shadow-none border-gray-100 bg-white/50">
                    <CardHeader className="py-3 px-4 bg-gray-50/50 border-b flex flex-row items-center space-y-0">
                        <CreditCard className="w-4 h-4 mr-2 text-brand-600" />
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Financial Allocations & Tracking</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {eventDetails.length > 0 ? (
                                eventDetails.map((ed, idx) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Activity className="w-8 h-8" />
                                        </div>
                                        <div className="font-bold text-brand-600 mb-2 pb-2 border-b border-gray-50 flex justify-between items-center text-[10px] uppercase tracking-tighter">
                                            <span>Tier #{idx + 1}</span>
                                            <span className="font-mono text-gray-300">ID: {ed.reqId || ed.eventId}</span>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">Account Mapping</span>
                                            <p className="font-mono font-black text-gray-900 text-sm tracking-tight">{ed.accountCode}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm col-span-1">
                                    <div className="font-bold text-brand-600 mb-2 pb-2 border-b border-gray-50 flex justify-between items-center text-[10px] uppercase">
                                        <span>Primary Event</span>
                                        <span className="font-mono text-gray-300">ID: {req.event_id || "N/A"}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-bold text-gray-400 uppercase">Account Code</span>
                                        <p className="font-mono font-black text-gray-900 text-sm">{req.account_code || "N/A"}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {req.credit_card_no && (
                            <div className="mt-8 flex items-center justify-between p-4 bg-brand-600 rounded-2xl shadow-xl shadow-brand/20">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <CreditCard className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-bold text-brand-100 uppercase tracking-widest block mb-0.5">Corporate Card Assignment</span>
                                        <span className="text-lg font-mono font-black text-white tracking-[0.2em]">{req.credit_card_no}</span>
                                    </div>
                                </div>
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">ACTIVE</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Section 3: Narrative Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="shadow-none border-gray-100 bg-white/50">
                        <CardHeader className="py-3 px-4 bg-gray-50/50 border-b flex flex-row items-center space-y-0">
                            <Target className="w-4 h-4 mr-2 text-brand-600" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Goal</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {req.objective || "No formal objective declared."}
                            </p>
                        </CardContent>
                    </Card>

                    {req.approval_notes && (
                        <Card className="shadow-none border-amber-200 bg-amber-50/30">
                            <CardHeader className="py-3 px-4 bg-amber-100/50 border-b border-amber-200 flex flex-row items-center space-y-0">
                                <MessageSquare className="w-4 h-4 mr-2 text-amber-600" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Approval Feedback</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <p className="text-sm text-amber-900/80 italic font-medium leading-relaxed">
                                    &ldquo;{req.approval_notes}&rdquo;
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Section 4: Promotional Channels */}
                {promotionalChannels.length > 0 && (
                    <Card className="shadow-none border-gray-100 bg-white/50">
                        <CardHeader className="py-3 px-4 bg-gray-50/50 border-b flex flex-row items-center space-y-0">
                            <Rss className="w-4 h-4 mr-2 text-brand-600" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Media Assets & Permissions ({promotionalChannels.length})</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {promotionalChannels.map((chan, idx) => (
                                    <div key={idx} className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-50">
                                            <span className="font-bold text-gray-900 text-xs">{chan.channel}</span>
                                            <span className="text-[10px] text-gray-300 font-mono">#{idx + 1}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Account</span>
                                                <span className="text-xs font-medium text-brand-600 truncate">{chan.mediaAccountEmail || "—"}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">Credentials</span>
                                                <span className="text-xs font-medium text-gray-600 line-clamp-1">{chan.accessList || "—"}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Section 5: Documentation */}
                {req.approval_file_url && (
                    <Card className="shadow-none border-indigo-100 bg-indigo-50/30">
                        <CardHeader className="py-3 px-4 bg-indigo-100/50 border-b border-indigo-200 flex flex-row items-center space-y-0">
                            <FileCheck className="w-4 h-4 mr-2 text-indigo-600" />
                            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Digital Archive</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-indigo-900 mb-0.5">Signed Form Attachment</p>
                                    <p className="text-[10px] text-indigo-500/70 font-medium tracking-tight">Verified digital signature and approval record</p>
                                </div>
                            </div>
                            {!req.approval_file_url.startsWith("data-ref:") && (
                                <a
                                    href={req.approval_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all"
                                >
                                    <span>OPEN FILE</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Section 6: Audit Timeline */}
                <Card className="shadow-none border-gray-100 bg-white/50">
                    <CardHeader className="py-3 px-4 bg-gray-50/50 border-b flex flex-row items-center space-y-0">
                        <History className="w-4 h-4 mr-2 text-brand-600" />
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compliance & Audit Trail ({reqLogs.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        {reqLogs.length === 0 ? (
                            <div className="text-center py-12 flex flex-col items-center">
                                <History className="w-8 h-8 text-gray-100 mb-2" />
                                <p className="text-xs text-gray-400 italic">Historical data immutable or not yet generated.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {reqLogs.map((log: AuditLog, idx: number) => (
                                    <div key={log.id} className="flex gap-4 relative group">
                                        {idx !== reqLogs.length - 1 && (
                                            <div className="absolute left-[17px] top-8 bottom-[-24px] w-0.5 bg-gray-100 group-hover:bg-brand-100 transition-colors" />
                                        )}
                                        <div className={cn(
                                            "w-9 h-9 rounded-2xl flex items-center justify-center text-xs shadow-sm z-10 shrink-0 transition-transform group-hover:scale-110",
                                            getActionColor(log.action)
                                        )}>
                                            {getActionIcon(log.action)}
                                        </div>
                                        <div className="flex-1 bg-white/80 rounded-2xl p-4 border border-gray-100 group-hover:border-brand-200 transition-all group-hover:shadow-lg group-hover:shadow-brand/5">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline" className={cn("text-[9px] uppercase tracking-widest font-black border-none", getActionColor(log.action))}>
                                                    {log.action}
                                                </Badge>
                                                <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                                    {new Date(log.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                                <span className="text-gray-950 font-black">{log.user_name || "System Automated"}</span>
                                                <ChevronRight className="w-3 h-3 inline mx-1.5 opacity-30" />
                                                <span className="text-gray-500">{describeAuditChange(log.action, log.changes)}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Section 7: Sub-Project Allocation */}
                <div className="pt-4 border-t border-gray-100">
                    <SubProjectAllocation
                        requestId={req.id}
                        totalAmount={req.amount}
                        isApproved={req.status === RequestStatus.APPROVED}
                        addToast={addToast}
                    />
                </div>
            </div>
        </div>
    );
}


