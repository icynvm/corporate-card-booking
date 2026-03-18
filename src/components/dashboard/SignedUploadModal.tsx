"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord } from "@/lib/types";

interface SignedUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RequestRecord | null;
    onSuccess?: () => void;
}

export function SignedUploadModal({ isOpen, onClose, request, onSuccess }: SignedUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);



    const handleUpload = async () => {
        if (!file || !request) return;

        setUploading(true);
        setUploadProgress(10); // Start at 10%

        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 90) {
                    clearInterval(progressInterval);
                    return 90;
                }
                return prev + Math.floor(Math.random() * 15 + 5);
            });
        }, 400);

        try {
            const formData = new FormData();
            formData.append("file", file);
            if (notes.trim()) {
                formData.append("notes", notes);
            }

            const res = await fetch(`/api/requests/${request.id}/upload-approval`, {
                method: "POST",
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Upload failed");
            }

            setUploaded(true);
            
            if (onSuccess) onSuccess();

            setTimeout(() => {
                onClose();
                setFile(null);
                setNotes("");
                setUploaded(false);
                setUploadProgress(0);
            }, 1500);
        } catch (err: any) {
            clearInterval(progressInterval);
            setUploadProgress(0);
            console.error(err);
            alert(err.message || "Failed to upload signed document. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Upload Signed Document">
            <>
                {uploaded ? (
                    <div className="text-center py-8 animate-slide-up">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-1">Upload Successful!</h3>
                        <p className="text-sm text-gray-500">The signed document has been saved.</p>
                    </div>
                ) : uploading ? (
                    <div className="text-center py-10 animate-slide-up">
                        <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-5">
                            <svg className="animate-spin w-8 h-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-800 mb-2">Uploading Document...</h3>
                        <div className="max-w-xs mx-auto mb-4">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div 
                                    className="bg-brand-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-brand-600 mt-2 font-mono font-bold">{Math.floor(uploadProgress)}%</p>
                        </div>
                        <p className="text-sm text-gray-400">
                            {uploadProgress < 40 ? "Reading file contents..." : 
                             uploadProgress < 80 ? "Uploading to secured storage..." : 
                             "Filing approval records..."}
                        </p>
                    </div>
                ) : (
                <div className="space-y-5">
                    {/* Request Info / Editable Fields */}
                    {request && (
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Request</span>
                                <span className="font-mono font-semibold text-brand-600">
                                    {request.event_id}
                                </span>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 block">Objective</label>
                                <p className="text-sm text-gray-800">{request.objective}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 block">Project</label>
                                    <p className="text-sm text-gray-800 truncate">{request.project_name}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 block">Amount</label>
                                    <p className="text-sm font-semibold text-gray-900">THB {request.amount?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="label-text mb-1 block">Signed Document</label>
                        {/* File Upload Dropzone */}
                        <div
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer bg-white ${file
                                ? "border-brand-300"
                                : "border-gray-200 hover:border-brand-200"
                                }`}
                            onClick={() => document.getElementById("signed-file")?.click()}
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
                                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-gray-400 hover:text-red-500">✕</button>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Click to upload signed form</p>
                                    <p className="text-xs text-gray-400 mt-1">PDF, JPEG or PNG (max 2MB)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <input
                        type="file"
                        id="signed-file"
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

                    <div>
                        <label className="label-text mb-1 block">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add comments here..."
                            rows={3}
                            className="input-field resize-none"
                        />
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="btn-primary w-full mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
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
                            "Submit Document"
                        )}
                    </button>
                </div>
            )}
            </>
        </Modal>
    );
}
