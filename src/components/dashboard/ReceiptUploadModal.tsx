"use client";

import { useState, useEffect } from "react";
import { parseISO, format, addDays, endOfMonth, isAfter } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord } from "@/lib/types";
import { getMonthsInRange } from "@/lib/utils/receipt-utils";

interface ReceiptUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RequestRecord | null;
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const MAX_FILES = 3;

const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());

export function ReceiptUploadModal({ isOpen, onClose, request }: ReceiptUploadModalProps) {
    const [selectedMonth, setSelectedMonth] = useState("");
    const [amount, setAmount] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);

    const currentYear = new Date().getFullYear();
    const isYearlyMonthly = request?.billing_type === "YEARLY_MONTHLY";

    // New logic: Monthly but spans > 2 months
    const monthsInRange = getMonthsInRange(request?.start_date, request?.end_date);
    const startDate = request?.start_date ? parseISO(request.start_date) : null;
    const endDate = request?.end_date ? parseISO(request.end_date) : null;

    const isMonthlyLongTerm = request?.billing_type === "MONTHLY" && monthsInRange.length > 2;
    const showMonthlyGrid = isYearlyMonthly || isMonthlyLongTerm;

    // Reset state when modal opens or request changes
    useEffect(() => {
        if (isOpen) {
            setFiles([]);
            setAmount("");
            setUploaded(false);
            if (request) {
                if (showMonthlyGrid) {
                    setSelectedMonth("");
                } else {
                    setSelectedMonth(`SINGLE-${request.id}`);
                }
            }
        }
    }, [isOpen, request?.id, showMonthlyGrid]);

    const handleUpload = async () => {
        if (!selectedMonth || files.length === 0 || !request) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("requestId", request.id);
            formData.append("monthYear", selectedMonth);
            formData.append("amount", amount || "0");
            files.forEach((f) => {
                formData.append("files", f);
            });

            const res = await fetch("/api/upload-receipt", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            setUploaded(true);
            setTimeout(() => {
                onClose();
                setFiles([]);
                setAmount("");
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

    const handleFilesSelected = (selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        const newFiles: File[] = [];
        const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];

        for (let i = 0; i < selectedFiles.length; i++) {
            const f = selectedFiles[i];
            if (f.size > 2 * 1024 * 1024) {
                alert(`"${f.name}" exceeds the 2MB size limit and was not added.`);
                continue;
            }
            if (!allowedTypes.includes(f.type)) {
                alert(`"${f.name}" is not a supported file type. Only PDF, JPEG and PNG are allowed.`);
                continue;
            }
            newFiles.push(f);
        }

        setFiles((prev) => {
            const combined = [...prev, ...newFiles];
            if (combined.length > MAX_FILES) {
                alert(`You can upload up to ${MAX_FILES} files only. Only the first ${MAX_FILES} files will be kept.`);
                return combined.slice(0, MAX_FILES);
            }
            return combined;
        });
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={showMonthlyGrid ? "Upload Monthly Receipt" : "Upload Receipt"}>
            {uploaded ? (
                <div className="text-center py-8 animate-slide-up">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Receipt Uploaded!</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">The receipt has been submitted for verification.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Request Info */}
                    {request && (
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400 dark:text-gray-500">Request</span>
                                <span className="font-mono font-semibold text-brand-600">
                                    {request.event_id}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-gray-400 dark:text-gray-500">Amount</span>
                                <span className="text-gray-900 dark:text-gray-50 font-medium">
                                    THB {request.amount?.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Monthly Tracking Grid for YEARLY_MONTHLY or Long-term MONTHLY */}
                    {showMonthlyGrid && (
                        <div>
                            <label className="label-text mb-3 block">
                                {isYearlyMonthly 
                                    ? `Monthly Tracking (${currentYear})` 
                                    : (isValidDate(startDate) && isValidDate(endDate)
                                        ? `Monthly Tracking (${format(startDate!, "MMM yyyy")} - ${format(endDate!, "MMM yyyy")})`
                                        : "Monthly Tracking")
                                }
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {(isYearlyMonthly ? MONTHS.map((_, i) => new Date(currentYear, i, 1)) : monthsInRange).map((mDate) => {
                                    const mKey = format(mDate, "yyyy-MM");
                                    const monthLabel = format(mDate, "MMMM");
                                    const existingFiles = request?.receipts?.filter(r => r.month_year === mKey) || [];
                                    const hasFiles = existingFiles.length > 0;
                                    const isSelected = selectedMonth === mKey;
                                    
                                    // Overdue check
                                    const today = new Date();
                                    const deadline = addDays(endOfMonth(mDate), 7);
                                    const isOverdue = !hasFiles && isAfter(today, deadline);

                                    return (
                                        <button
                                            key={mKey}
                                            onClick={() => setSelectedMonth(mKey)}
                                            className={`flex flex-col items-center p-2 rounded-xl border transition-all relative ${isSelected
                                                ? "border-brand-500 bg-brand-50 shadow-sm"
                                                : hasFiles
                                                    ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                                                    : isOverdue
                                                        ? "border-red-200 bg-red-50 hover:bg-red-100/50"
                                                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50 dark:bg-gray-900/50"
                                                }`}
                                        >
                                            {isOverdue && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm z-10">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                                        <line x1="12" y1="9" x2="12" y2="13" />
                                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                                    </svg>
                                                </div>
                                            )}
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? "text-brand-600" : isOverdue ? "text-red-600" : "text-gray-400 dark:text-gray-500"}`}>
                                                {monthLabel.slice(0, 3)}
                                            </span>
                                            <div className="mt-1 relative">
                                                {hasFiles ? (
                                                    <>
                                                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        </div>
                                                        {existingFiles.length > 1 && (
                                                            <span className="absolute -top-1.5 -right-2 text-[8px] font-black text-emerald-700 bg-emerald-100 rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                                                                {existingFiles.length}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className={`w-5 h-5 rounded-full border-2 border-dashed ${isSelected ? "border-brand-300" : isOverdue ? "border-red-300" : "border-gray-200"}`} />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Selection Detail & Upload */}
                    {selectedMonth && (
                        <div className="bg-brand-50/30 rounded-2xl p-5 border border-brand-100 animate-slide-up">
                            <div className="mb-4">
                                <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                                    {showMonthlyGrid && selectedMonth && !selectedMonth.startsWith("SINGLE")
                                        ? (() => {
                                            const d = parseISO(`${selectedMonth}-01`);
                                            return isValidDate(d) ? format(d, "MMMM yyyy") : "Monthly Receipt";
                                        })()
                                        : "Attached Files"}
                                </h4>
                            </div>

                            <div className="mb-4">
                                <label className="label-text block mb-1.5">Actual Amount Paid (THB)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">THB</span>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        className="input-field !pl-11"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Enter the exact amount charged on the credit card for this receipt.</p>
                            </div>

                            {/* Existing uploaded files list */}
                            {(() => {
                                const existingFiles = request?.receipts?.filter(r => r.month_year === selectedMonth) || [];
                                if (existingFiles.length === 0) return null;
                                return (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                                {existingFiles.length} file{existingFiles.length > 1 ? "s" : ""} uploaded
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {existingFiles.map((receipt, idx) => {
                                                // Extract display name from URL
                                                const urlParts = receipt.receipt_file_url.split("/");
                                                const rawName = decodeURIComponent(urlParts[urlParts.length - 2] || urlParts[urlParts.length - 1] || "File");
                                                // Remove monthYear prefix and index for cleaner display
                                                const displayName = rawName.replace(/^[\d-]+-\d+-/, "").replace(/^[\d-]+-/, "").replace(/_/g, " ");

                                                return (
                                                    <div key={receipt.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 border border-emerald-100 shadow-sm">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{displayName}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                                                    {receipt.status === "VERIFIED" ? "✓ Verified" : "Pending verification"}
                                                                </p>
                                                                {receipt.amount > 0 && (
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                                        THB {receipt.amount.toLocaleString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-1.5 py-0.5 rounded-md">#{idx + 1}</span>
                                                        <a
                                                            href={receipt.receipt_file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 flex-shrink-0 px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                            View
                                                        </a>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* File counter badge */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {files.length} / {MAX_FILES} files selected
                                </span>
                                {files.length > 0 && (
                                    <button
                                        onClick={() => setFiles([])}
                                        className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {/* Selected Files List */}
                            {files.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {files.map((f, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 shadow-sm">
                                            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                                                {f.type === "application/pdf" ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{f.name}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                            <button
                                                onClick={() => removeFile(idx)}
                                                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                                                title="Remove file"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* File Upload Dropzone */}
                            {files.length < MAX_FILES && (
                                <div
                                    className="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer bg-white dark:bg-gray-800 border-gray-200 hover:border-brand-200"
                                    onClick={() => document.getElementById("receipt-file")?.click()}
                                >
                                    <div>
                                        <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            {files.length === 0 ? "Click to upload receipt" : "Click to add more files"}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            PDF, JPEG or PNG (max 2MB each · up to {MAX_FILES} files)
                                        </p>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                id="receipt-file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                multiple
                                onChange={(e) => {
                                    handleFilesSelected(e.target.files);
                                    // Reset the input so the same file(s) can be selected again if needed
                                    e.target.value = "";
                                }}
                            />

                            <button
                                onClick={handleUpload}
                                disabled={files.length === 0 || uploading}
                                className="btn-primary w-full mt-4 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Uploading...
                                    </>
                                ) : (
                                    `Save Receipt${files.length > 1 ? `s (${files.length})` : ""}`
                                )}
                            </button>
                        </div>
                    )}

                </div>
            )}
        </Modal>
    );
}
