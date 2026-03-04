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
        <Modal isOpen={isOpen} onClose={onClose} title="Upload Monthly Receipt">
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
                                <span className="font-semibold text-gray-700">
                                    ฿{request.amount?.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Month Selector */}
                    <div>
                        <label className="label-text">Select Month</label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="select-field"
                        >
                            <option value="">Choose a month...</option>
                            {MONTHS.map((month, idx) => (
                                <option key={month} value={`${currentYear}-${String(idx + 1).padStart(2, "0")}`}>
                                    {month} {currentYear}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="label-text">Upload Receipt (Image/PDF)</label>
                        <div
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${file
                                ? "border-brand-300 bg-brand-50/50"
                                : "border-gray-200 hover:border-brand-200 hover:bg-brand-50/30"
                                }`}
                            onClick={() => document.getElementById("receipt-file")?.click()}
                        >
                            {file ? (
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-500 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14,2 14,8 20,8" />
                                        <polyline points="16 13 12 17 8 13" />
                                        <line x1="12" y1="17" x2="12" y2="9" />
                                    </svg>
                                    <p className="text-sm font-medium text-brand-600">{file.name}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <p className="text-sm text-gray-400">
                                        Click to browse or drag & drop
                                    </p>
                                    <p className="text-xs text-gray-300 mt-1">
                                        Supports: PDF, JPG, PNG (max 10MB)
                                    </p>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            id="receipt-file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                    </div>

                    {/* Existing Receipts */}
                    {request?.receipts && request.receipts.length > 0 && (
                        <div>
                            <label className="label-text">Previous Receipts</label>
                            <div className="space-y-2">
                                {request.receipts.map((receipt) => (
                                    <div
                                        key={receipt.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
                                    >
                                        <span className="text-gray-600">{receipt.month_year}</span>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${receipt.status === "VERIFIED"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-amber-100 text-amber-700"
                                                }`}
                                        >
                                            {receipt.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleUpload}
                        disabled={!selectedMonth || !file || uploading}
                        className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
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
                            "Upload Receipt"
                        )}
                    </button>
                </div>
            )}
        </Modal>
    );
}
