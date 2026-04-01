"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
    CheckCircle2, 
    Upload, 
    FileText, 
    X, 
    Loader2, 
    Hash,
    Briefcase,
    DollarSign,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        setUploadProgress(10);

        const progressInterval = setInterval(() => {
            setUploadProgress((prev) => {
                if (prev >= 95) {
                    clearInterval(progressInterval);
                    return 95;
                }
                return prev + Math.floor(Math.random() * 10 + 2);
            });
        }, 300);

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
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Authorization Sync"
            maxWidth="max-w-xl"
        >
            {uploaded ? (
                <div className="text-center py-12 animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Authorization Verified</h3>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">The signed directive is now officially recorded.</p>
                </div>
            ) : uploading ? (
                <div className="text-center py-12 space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative w-24 h-24 mx-auto">
                        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                        <div 
                            className="absolute inset-0 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" 
                            style={{ animationDuration: '1.5s' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-black text-brand-700">{Math.floor(uploadProgress)}%</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Syncing Document...</h3>
                        <div className="max-w-xs mx-auto">
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div 
                                    className="bg-brand-500 h-full transition-all duration-500 ease-out" 
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40 animate-pulse">
                            {uploadProgress < 40 ? "Initializing Secure Channel" : 
                             uploadProgress < 80 ? "Verifying Digital Signature" : 
                             "Finalizing Audit Record"}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Visual Context */}
                    {request && (
                        <div className="grid grid-cols-2 gap-4 p-6 rounded-2xl bg-gray-50/50 border border-gray-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Briefcase className="w-16 h-16 text-gray-900" />
                            </div>
                            <div className="space-y-1 relative z-10">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 opacity-50">
                                    <Hash className="w-3 h-3" /> Record Ref
                                </p>
                                <p className="text-sm font-black text-brand-700 font-mono italic">{request.req_id || request.event_id}</p>
                                <div className="pt-2">
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50 mb-0.5">Project Scope</p>
                                    <p className="text-xs font-bold text-gray-800 line-clamp-1">{request.project_name}</p>
                                </div>
                            </div>
                            <div className="space-y-1 text-right relative z-10">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-end gap-1.5 opacity-50">
                                    Allocation <DollarSign className="w-3 h-3" />
                                </p>
                                <p className="text-lg font-black text-gray-900 leading-none">฿{request.amount?.toLocaleString()}</p>
                                <div className="pt-3">
                                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-white/50 border-gray-200">
                                        Authorized Only
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form Section */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <label className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-900 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-brand-600" /> 
                                Authorization Evidence
                            </label>
                            
                            <div
                                className={cn(
                                    "relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer group",
                                    file ? "border-brand-400 bg-brand-50/20" : "border-gray-200 bg-gray-50/30 hover:border-brand-300 hover:bg-brand-50/10"
                                )}
                                onClick={() => document.getElementById("signed-file")?.click()}
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
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40">Validated</span>
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
                                        <div className="w-16 h-16 rounded-3xl bg-white shadow-sm flex items-center justify-center mx-auto group-hover:rotate-12 transition-transform duration-500">
                                            <Upload className="w-8 h-8 text-brand-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-gray-900">Upload Signed Authority</p>
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest opacity-50">PDF, JPEG or PNG (Max 2MB)</p>
                                        </div>
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

                        <div className="space-y-3">
                            <label className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-900 flex items-center gap-2">
                                <Info className="w-4 h-4 text-brand-600" /> 
                                Administrative Notes
                            </label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add context for auditors..."
                                className="min-h-[100px] rounded-xl border-gray-100 bg-gray-50/30 focus:bg-white transition-all text-sm font-medium resize-none px-4 py-3"
                            />
                        </div>

                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            variant="brand"
                            size="lg"
                            className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-brand/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {uploading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Record Authorization"
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
