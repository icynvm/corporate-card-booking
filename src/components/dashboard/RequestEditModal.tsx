"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord } from "@/lib/types";

interface RequestEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RequestRecord | null;
    onSuccess?: () => void;
}

export function RequestEditModal({ isOpen, onClose, request, onSuccess }: RequestEditModalProps) {
    const [objective, setObjective] = useState("");
    const [projectName, setProjectName] = useState("");
    const [amount, setAmount] = useState("");
    const [contactNo, setContactNo] = useState("");
    const [email, setEmail] = useState("");
    const [billingType, setBillingType] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (request && isOpen) {
            setObjective(request.objective || "");
            setProjectName(request.project_name || "");
            setAmount(request.amount?.toString() || "");
            setContactNo(request.contact_no || "");
            setEmail(request.email || "");
            setBillingType(request.billing_type || "ONE_TIME");
            setStartDate(request.start_date ? request.start_date.substring(0, 10) : "");
            setEndDate(request.end_date ? request.end_date.substring(0, 10) : "");
            setError("");
        }
    }, [request, isOpen]);

    const handleSave = async () => {
        if (!request) return;
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`/api/requests/${request.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    objective,
                    project_name: projectName,
                    amount: amount ? parseFloat(amount) : 0,
                    contact_no: contactNo,
                    email,
                    billing_type: billingType,
                    start_date: startDate,
                    end_date: endDate
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
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Request Details">
            <div className="space-y-4">
                {error && (
                    <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{error}</p>
                )}
                
                <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Objective</label>
                    <textarea 
                        value={objective} 
                        onChange={(e) => setObjective(e.target.value)} 
                        className="input-field resize-none text-sm p-2 w-full border rounded-lg" 
                        rows={2} 
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Project Name</label>
                        <input 
                            type="text"
                            value={projectName} 
                            onChange={(e) => setProjectName(e.target.value)} 
                            className="input-field text-sm p-2 w-full border rounded-lg" 
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Amount (THB)</label>
                        <input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            className="input-field text-sm p-2 w-full border rounded-lg" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Contact No</label>
                        <input 
                            type="text"
                            value={contactNo} 
                            onChange={(e) => setContactNo(e.target.value)} 
                            className="input-field text-sm p-2 w-full border rounded-lg" 
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Email</label>
                        <input 
                            type="email"
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className="input-field text-sm p-2 w-full border rounded-lg" 
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Billing Type</label>
                    <select 
                        value={billingType} 
                        onChange={(e) => setBillingType(e.target.value)} 
                        className="input-field text-sm p-2 w-full border rounded-lg bg-white"
                    >
                        <option value="ONE_TIME">One-Time</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="YEARLY_MONTHLY">Yearly/Monthly</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">Start Date</label>
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                            className="input-field text-sm p-2 w-full border rounded-lg" 
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 block">End Date</label>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                            className="input-field text-sm p-2 w-full border rounded-lg" 
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {saving && (
                            <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
