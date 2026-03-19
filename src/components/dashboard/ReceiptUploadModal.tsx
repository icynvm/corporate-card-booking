"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord } from "@/lib/types";

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

    // Initialize selectedMonth to "SINGLE" if not yearly-monthly so the upload area shows automatically
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
        <Modal isOpen={isOpen} onClose={onClose} title={isYearlyMonthly ? "Upload Monthly Receipt" : "Upload Receipt"}>
            {uploaded ? (
                <div className="text-center py-8 animate-slide-up">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-1">Receipt Uploaded!</h3>
                    <p className="text-sm text-gray-500">The receipt has been submitted for verification.</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Request Info */}
                    {request && (
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Request</span>
                                <span className="font-mono font-semibold text-brand-600">
                                    {request.event_id}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm mt-1">
                                <span className="text-gray-400">Amount</span>
                                <span className="text-gray-900 font-medium">
                                    THB {request.amount?.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Monthly Tracking Grid ONLY for YEARLY_MONTHLY */}
                    {isYearlyMonthly && (
                        <div>
                            <label className="label-text mb-3 block">Monthly Tracking ({currentYear})</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {MONTHS.map((month, idx) => {
                                    const mKey = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
                                    const existing = request?.receipts?.find(r => r.month_year === mKey);
                                    const isSelected = selectedMonth === mKey;

                                    return (
                                        <button
                                            key={month}
                                            onClick={() => setSelectedMonth(mKey)}
                                            className={`flex flex-col items-center p-2 rounded-xl border transition-all ${isSelected
                                                ? "border-brand-500 bg-brand-50 shadow-sm"
                                                : existing
                                                    ? "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                                                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                                }`}
                                        >
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? "text-brand-600" : "text-gray-400"}`}>
                                                {month.slice(0, 3)}
                                            </span>
                                            <div className="mt-1">
                                                {existing ? (
                                                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                            <polyline points="20 6 9 17 4 12" />
                                                        </svg>
                                                    </div>
                                                ) : (
                                                    <div className={`w-5 h-5 rounded-full border-2 border-dashed ${isSelected ? "border-brand-300" : "border-gray-200"}`} />
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
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-gray-800 text-sm">
                                    {isYearlyMonthly
                                        ? `${MONTHS[parseInt(selectedMonth.split("-")[1]) - 1]} ${currentYear}`
                                        : "Attached File"}
                                </h4>
                                {request?.receipts?.find(r => r.month_year === selectedMonth) && (
                                    <a
                                        href={request.receipts.find(r => r.month_year === selectedMonth)?.receipt_file_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        View Current
                                    </a>
                                )}
                            </div>

                            {/* File Upload Dropzone */}
                            <div
                                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer bg-white ${file
                                    ? "border-brand-300"
                                    : "border-gray-200 hover:border-brand-200"
                                    }`}
                                onClick={() => document.getElementById("receipt-file")?.click()}
                            >
                                {file ? (
                                    <div className="flex items-center gap-3 text-left">
                                        <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-gray-400 hover:text-red-500">.</button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium">Click to upload receipt</p>
                                        <p className="text-xs text-gray-400 mt-1">PDF, JPEG or PNG (max 2MB)</p>
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

                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
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
                                    "Save Receipt"
                                )}
                            </button>
                        </div>
                    )}

                </div>
            )}
        </Modal>
    );
}
