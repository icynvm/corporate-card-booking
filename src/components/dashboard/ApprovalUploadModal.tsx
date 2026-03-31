"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";

interface ApprovalUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: string | null;
    eventId: string;
    onSuccess: () => void;
}

export function ApprovalUploadModal({ isOpen, onClose, requestId, eventId, onSuccess }: ApprovalUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [notes, setNotes] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setFile(f);
        setError(null);

        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
        }
    };

    const handleUpload = async () => {
        if (!file || !requestId) return;
        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("notes", notes);

            const res = await fetch(`/api/requests/${requestId}/upload-approval`, {
                method: "POST",
                body: formData,
            });

            if (res.ok) {
                onSuccess();
                handleClose();
            } else {
                const data = await res.json();
                setError(data.error || "Upload failed");
            }
        } catch {
            setError("Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setPreview(null);
        setNotes("");
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Upload Approval — ${eventId}`}>
            <div className="space-y-5">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                {/* Drop zone */}
                <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-brand-300 rounded-xl p-8 text-center cursor-pointer transition-colors"
                >
                    {file ? (
                        <div className="space-y-2">
                            {preview && (
                                <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                            )}
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{file.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    ) : (
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-gray-300 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 font-medium">Click to upload signed approval</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">PDF or Image (max 10MB)</p>
                        </div>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="label-text">Approval Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="input-field min-h-[80px] resize-none"
                        placeholder="e.g. Approved by John Smith, VP Marketing"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                    <button onClick={handleClose} className="btn-secondary">Cancel</button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="btn-primary disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Uploading...
                            </>
                        ) : (
                            "Upload & Attach"
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

