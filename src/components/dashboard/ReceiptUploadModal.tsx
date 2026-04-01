"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    CheckCircle2, 
    Upload, 
    FileText, 
    X, 
    Eye, 
    Loader2, 
    Calendar,
    DollarSign,
    Hash
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReceiptUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RequestRecord | null;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

export function ReceiptUploadModal({ isOpen, onClose, request }: ReceiptUploadModalProps) {
    const [selectedMonth, setSelectedMonth] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);

    const currentYear = new Date().getFullYear();
    const isYearlyMonthly = request?.billing_type === "YEARLY_MONTHLY";

    if (request && !isYearlyMonthly && selectedMonth === "") {
        setSelectedMonth(`SINGLE-${request.id}`);
    }

    const handleUpload = async () => {
        if (!selectedMonth || !file || !request) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("requestId", request.id);
            formData.append("monthYear", selectedMonth);
            formData.append("file", file);

            const res = await fetch("/api/upload-receipt", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            setUploaded(true);
            setTimeout(() => {
                onClose();
                setFile(null);
                setSelectedMonth("");
                setUploaded(false);
            }, 1500);
        } catch (err) {
            console.error(err);
            alert("Failed to upload receipt. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isYearlyMonthly ? "Monthly Expenditure Sync" : "Verify Expenditure"}
            maxWidth="max-w-xl"
        >
            {uploaded ? (
                <div className="text-center py-12 animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Receipt Synchronized</h3>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">The financial record has been updated.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Request Context Card */}
                    {request && (
                        <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-gray-50/50 border border-gray-100">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 opacity-50">
                                    <Hash className="w-3 h-3" /> Reference
                                </p>
                                <p className="text-sm font-black text-brand-700 font-mono">{request.req_id || request.event_id}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 opacity-50">
                                    <DollarSign className="w-3 h-3" /> Amount
                                </p>
                                <p className="text-sm font-black text-gray-900">฿{request.amount?.toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    {/* Monthly Selector Grid */}
                    {isYearlyMonthly && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-brand-600" />
                                <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Billing Cycle: {currentYear}</span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                {MONTHS.map((month, idx) => {
                                    const mKey = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
                                    const existing = request?.receipts?.find(r => r.month_year === mKey);
                                    const isSelected = selectedMonth === mKey;

                                    return (
                                        <button
                                            key={month}
                                            onClick={() => setSelectedMonth(mKey)}
                                            className={cn(
                                                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all group",
                                                isSelected
                                                    ? "border-brand-500 bg-brand-50/50 shadow-md transform scale-105 z-10"
                                                    : existing
                                                        ? "border-emerald-100 bg-emerald-50/30 hover:border-emerald-200"
                                                        : "border-gray-50 bg-white hover:border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-tighter transition-colors",
                                                isSelected ? "text-brand-700" : existing ? "text-emerald-700" : "text-gray-400 group-hover:text-gray-600"
                                            )}>
                                                {month.slice(0, 3)}
                                            </span>
                                            <div className="mt-2 text-center flex items-center justify-center h-4 w-4">
                                                {existing ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                ) : (
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        isSelected ? "bg-brand-400 animate-pulse" : "bg-gray-100"
                                                    )} />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Upload Management Section */}
                    {selectedMonth && (
                        <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-brand-500 rounded-full" />
                                    {isYearlyMonthly
                                        ? `Period: ${MONTHS[parseInt(selectedMonth.split("-")[1]) - 1]} ${currentYear}`
                                        : "Evidence Attachment"}
                                </h4>
                                {request?.receipts?.find(r => r.month_year === selectedMonth) && (
                                    <Button asChild variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase tracking-tight text-brand-600">
                                        <a href={request.receipts.find(r => r.month_year === selectedMonth)?.receipt_file_url} target="_blank" rel="noopener noreferrer">
                                            <Eye className="w-3 h-3 mr-1.5" /> View Current
                                        </a>
                                    </Button>
                                )}
                            </div>

                            {/* Enhanced Dropzone */}
                            <div
                                className={cn(
                                    "relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group",
                                    file ? "border-brand-400 bg-brand-50/20" : "border-gray-200 bg-gray-50/30 hover:border-brand-300 hover:bg-brand-50/10"
                                )}
                                onClick={() => document.getElementById("receipt-file")?.click()}
                            >
                                {file ? (
                                    <div className="flex items-center gap-5 text-left">
                                        <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                            <FileText className="w-7 h-7 text-brand-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-gray-900 truncate">{file.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[9px] font-bold h-4">
                                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                                </Badge>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Ready to sync</span>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="rounded-full h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                                            <Upload className="w-8 h-8 text-brand-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-gray-900">Selection required</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-50">PDF, JPEG or PNG (Max 2MB)</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <input
                                type="file"
                                id="receipt-file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0];
                                    if (selectedFile) {
                                        if (selectedFile.size > 2 * 1024 * 1024) {
                                            alert("File size exceeds 2MB limit");
                                            return;
                                        }
                                        const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
                                        if (!allowedTypes.includes(selectedFile.type)) {
                                            alert("Only PDF, JPEG and PNG files are allowed");
                                            return;
                                        }
                                        setFile(selectedFile);
                                    }
                                }}
                            />

                            <Button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                variant="brand"
                                className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-brand/20"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Synchronizing...
                                    </>
                                ) : (
                                    "Confirm & Upload Record"
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
