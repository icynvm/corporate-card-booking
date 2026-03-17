"use client";

import { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { PROMOTIONAL_CHANNELS } from "@/lib/validations/schema";

interface RequestEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RequestRecord | null;
    onSuccess?: () => void;
}

interface ProjectOption {
    id: string;
    project_name: string;
}

export function RequestEditModal({ isOpen, onClose, request, onSuccess }: RequestEditModalProps) {
    const [fullName, setFullName] = useState("");
    const [department, setDepartment] = useState("");
    const [objective, setObjective] = useState("");
    const [amount, setAmount] = useState("");
    const [contactNo, setContactNo] = useState("");
    const [email, setEmail] = useState("");
    const [billingType, setBillingType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [bookingDate, setBookingDate] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    
    // Project Search States
    const [projectSearch, setProjectSearch] = useState("");
    const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const projectRef = useRef<HTMLDivElement>(null);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (request && isOpen) {
            setFullName(request.full_name || "");
            setDepartment(request.department || "");
            setObjective(request.objective || "");
            setProjectSearch(request.project_name || "");
            setSelectedProjectId(request.project_id || null);
            setAmount(request.amount?.toString() || "");
            setContactNo(request.contact_no || "");
            setEmail(request.email || "");
            setBillingType(request.billing_type || "ONE_TIME");
            setStartDate(request.start_date ? request.start_date.substring(0, 10) : "");
            setEndDate(request.end_date ? request.end_date.substring(0, 10) : "");
            setBookingDate(request.booking_date ? request.booking_date.substring(0, 10) : "");
            setEffectiveDate(request.effective_date ? request.effective_date.substring(0, 10) : "");
            
            // Map promotional channels
            const channels = Array.isArray(request.promotional_channels) ? request.promotional_channels : [];
            setSelectedChannels(new Set(channels.map((c: any) => typeof c === 'string' ? c : c?.channel).filter(Boolean)));
            setError("");
        }
    }, [request, isOpen]);

    // Fetch projects for autocomplete
    useEffect(() => {
        if (!projectSearch) {
             setProjectOptions([]);
             return;
        }
        const fetchProjects = async () => {
            try {
                const res = await fetch(`/api/projects?search=${encodeURIComponent(projectSearch)}`);
                if (res.ok) {
                    const data = await res.json();
                    setProjectOptions(data);
                }
            } catch { /* ignore */ }
        };

        const timer = setTimeout(fetchProjects, 300);
        return () => clearTimeout(timer);
    }, [projectSearch]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
                setShowProjectDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleChannelToggle = (channel: string) => {
        const newSelection = new Set(selectedChannels);
        if (newSelection.has(channel)) {
            newSelection.delete(channel);
        } else {
            newSelection.add(channel);
        }
        setSelectedChannels(newSelection);
    };

    const handleSave = async () => {
        if (!request) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`/api/requests/${request.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fullName,
                    department, // Will only save if the column exists or is handled accordingly.
                    objective,
                    project_name: projectSearch,
                    projectId: selectedProjectId,
                    amount: amount ? parseFloat(amount) : 0,
                    contact_no: contactNo,
                    email,
                    billing_type: billingType,
                    start_date: startDate,
                    end_date: endDate,
                    bookingDate,
                    effectiveDate,
                    promotionalChannels: Array.from(selectedChannels)
                })
            });

            if (res.ok) {
                onSuccess?.();
                onClose();
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update request");
            }
        } catch (err) {
            setError("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Request Detail">
            <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                {error && (
                    <p className="text-xs text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
                )}
                
                {/* 1. Requester Staff */}
                <div>
                    <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-brand-50 flex items-center justify-center text-[10px]">1</span>
                        Requester Staff
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-text-small">Full Name</label>
                            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field text-sm" />
                        </div>
                        <div>
                            <label className="label-text-small">Team</label>
                            <input value={department} onChange={(e) => setDepartment(e.target.value)} className="input-field text-sm" placeholder="e.g. Web Dev" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                            <label className="label-text-small">Contact No.</label>
                            <input value={contactNo} onChange={(e) => setContactNo(e.target.value)} className="input-field text-sm" />
                        </div>
                        <div>
                            <label className="label-text-small">E-Mail</label>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="input-field text-sm" />
                        </div>
                    </div>
                </div>

                {/* 2. Request Details */}
                <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center text-[10px]">2</span>
                        Request Details
                    </h3>
                    
                    <div className="space-y-3">
                         <div ref={projectRef} className="relative">
                            <label className="label-text-small">Project Name</label>
                            <input
                                type="text"
                                value={projectSearch}
                                onChange={(e) => {
                                    setProjectSearch(e.target.value);
                                    setShowProjectDropdown(true);
                                    setSelectedProjectId(null);
                                }}
                                onFocus={() => setShowProjectDropdown(true)}
                                className="input-field text-sm"
                            />
                            {showProjectDropdown && projectSearch && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-36 overflow-y-auto">
                                    {projectOptions.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setProjectSearch(p.project_name);
                                                setSelectedProjectId(p.id);
                                                setShowProjectDropdown(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 transition-colors"
                                        >
                                            {p.project_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="label-text-small">Objective</label>
                            <textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="input-field text-sm resize-none" rows={2} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label-text-small">Booking Date</label>
                                <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="label-text-small">Effective Date</label>
                                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="input-field text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label-text-small">Start Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="label-text-small">End Date</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field text-sm" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="label-text-small">Amount (THB)</label>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="label-text-small">Billing Type</label>
                                <select value={billingType} onChange={(e) => setBillingType(e.target.value)} className="select-field text-sm">
                                    <option value="ONE_TIME">One-time</option>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="YEARLY">Yearly</option>
                                    <option value="YEARLY_MONTHLY">Yearly/Monthly</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Promotional Channels */}
                <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-md bg-purple-50 flex items-center justify-center text-[10px]">3</span>
                        Promotional Channels
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        {PROMOTIONAL_CHANNELS.map((channel) => {
                            const isChecked = selectedChannels.has(channel);
                            return (
                                <button
                                    key={channel}
                                    type="button"
                                    onClick={() => handleChannelToggle(channel)}
                                    className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all
                                    ${isChecked ? "bg-brand-50 border-brand-200 text-brand-700" : "bg-gray-50/50 border-gray-100 text-gray-500 hover:border-brand-200"}`}
                                >
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center
                                    ${isChecked ? "bg-brand-500 border-brand-500" : "border-gray-300"}`}>
                                        {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    {channel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                        {saving && <svg className="animate-spin w-4 h-4 text-white" stroke="currentColor" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
