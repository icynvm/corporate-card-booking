"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlassCard } from "@/components/ui/GlassCard";
import { PostSubmissionActions } from "@/components/forms/PostSubmissionActions";
import { normalizeThai } from "@/lib/thai-utils";
import { supabase } from "@/lib/supabase";
import {
    requestFormSchema,
    RequestFormData,
    PROMOTIONAL_CHANNELS,
} from "@/lib/validations/schema";

interface ProjectOption {
    id: string;
    project_name: string;
}

export function CardRequestForm() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState<RequestFormData | null>(null);
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [eventOptions, setEventOptions] = useState<any[]>([]);
    const [accountOptions, setAccountOptions] = useState<any[]>([]);
    const [cardOptions, setCardOptions] = useState<any[]>([]);
    const [customChannelName, setCustomChannelName] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<RequestFormData>({
        resolver: zodResolver(requestFormSchema),
        defaultValues: {
            fullName: "",
            department: "",
            contactNo: "",
            email: "",
            objective: "",
            projectId: "",
            bookingDate: "",
            effectiveDate: "",
            startDate: "",
            endDate: "",
            amount: 0,
            billingType: "ONE_TIME",
            accountCode: "",
            creditCardNo: "",
            promotionalChannels: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "promotionalChannels",
    });

    // Fetch Master Data
    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                // Fetch Projects
                const resProjects = await fetch("/api/projects");
                if (resProjects.ok) setProjectOptions(await resProjects.json());

                // Fetch Events
                const resEvents = await fetch("/api/master-data/events");
                if (resEvents.ok) setEventOptions(await resEvents.json());

                // Fetch Account Codes
                const resAccounts = await fetch("/api/master-data/accounts");
                if (resAccounts.ok) setAccountOptions(await resAccounts.json());

                // Fetch Credit Cards
                const resCards = await fetch("/api/master-data/cards");
                if (resCards.ok) setCardOptions(await resCards.json());
            } catch (err) {
                console.error("Master data fetch failed:", err);
            }
        };
        fetchMasterData();
    }, []);

    const handleChannelToggle = (channel: string) => {
        const newSelection = new Set(selectedChannels);
        if (newSelection.has(channel)) {
            newSelection.delete(channel);
            const idx = fields.findIndex((f) => f.channel === channel);
            if (idx !== -1) remove(idx);
        } else {
            newSelection.add(channel);
            append({ channel, mediaAccountEmail: "", accessList: "" });
        }
        setSelectedChannels(newSelection);
    };

    const handleAddCustomChannel = () => {
        if (!customChannelName.trim()) return;
        const channel = customChannelName.trim();
        if (!selectedChannels.has(channel)) {
            handleChannelToggle(channel);
        }
        setCustomChannelName("");
        setShowCustomInput(false);
    };

    // normalizeThai imported from thai-utils

    const onSubmit = async (data: RequestFormData) => {
        setSubmitError(null);

        // โ… Sanitize object recursively
        const sanitize = (obj: any): any => {
            if (typeof obj === "string") return normalizeThai(obj);
            if (Array.isArray(obj)) return obj.map(sanitize);
            if (obj && typeof obj === "object") {
                const out: any = {};
                for (const k in obj) out[k] = sanitize(obj[k]);
                return out;
            }
            return obj;
        };

        const cleanData = sanitize(data);

        // Get project name from options
        const selectedProject = projectOptions.find((p: any) => p.id === cleanData.projectId);

        const requestBody = {
            ...cleanData,
            projectName: selectedProject?.project_name || "",
            userId: null,
        };

        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (res.ok) {
                setSubmittedData(requestBody as any);
                setIsSubmitted(true);
            } else {
                const errorData = await res.json();
                setSubmitError(errorData.error || "Failed to submit request (Server Error)");
            }
        } catch (err) {
            setSubmitError("Failed to connect to the server. Please check your connection.");
        }
    };

    const { onChange: fullNameOnChange, ...fullNameProps } = register("fullName");
    const { onChange: departmentOnChange, ...departmentProps } = register("department");
    const { onChange: objectiveOnChange, ...objectiveProps } = register("objective");

    if (isSubmitted && submittedData) {
        return <div className="max-w-3xl mx-auto"><PostSubmissionActions formData={submittedData} /></div>;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    New Card <span className="gradient-text">Request</span>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                    Fill in the details below to request corporate card usage.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {submitError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-3 animate-shake">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {submitError}
                    </div>
                )}
                {/* Personal Information */}
                <GlassCard>
                    <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">1</span>
                        Personal Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="label-text">Full Name</label>
                            <input
                                {...fullNameProps}
                                onChange={(e) => { e.target.value = normalizeThai(e.target.value); fullNameOnChange(e); }}
                                className="input-field"
                                placeholder="Enter your full name"
                            />
                            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
                        </div>
                        <div>
                            <label className="label-text">Team</label>
                            <input
                                {...departmentProps}
                                onChange={(e) => { e.target.value = normalizeThai(e.target.value); departmentOnChange(e); }}
                                className="input-field"
                                placeholder="e.g. Web Developer"
                            />
                            {errors.department && <p className="text-red-400 text-xs mt-1">{errors.department.message}</p>}
                        </div>
                        <div>
                            <label className="label-text">Contact No.</label>
                            <input {...register("contactNo")} className="input-field" placeholder="e.g. 081-234-5678" />
                            {errors.contactNo && <p className="text-red-400 text-xs mt-1">{errors.contactNo.message}</p>}
                        </div>
                        <div>
                            <label className="label-text">E-Mail</label>
                            <input {...register("email")} type="email" className="input-field" placeholder="you@company.com" />
                            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="label-text">Project Name</label>
                            <select
                                {...register("projectId")}
                                className="select-field"
                            >
                                <option value="">Select a project...</option>
                                {projectOptions.map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.project_name}</option>
                                ))}
                            </select>
                            {errors.projectId && <p className="text-red-400 text-xs mt-1">{errors.projectId.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4 border-t border-gray-100 dark:border-gray-800/50 mt-4">
                            <div>
                                <label className="label-text">Linked Event ID</label>
                                <select
                                    className="select-field"
                                    onChange={(e: any) => {
                                        const ev = eventOptions.find(opt => opt.event_id === e.target.value);
                                        if (ev) {
                                            setValue("accountCode", ev.account_code || "");
                                        }
                                    }}
                                >
                                    <option value="">Select an Event ID...</option>
                                    {eventOptions.map((ev: any) => (
                                        <option key={ev.id} value={ev.event_id}>{ev.event_id} - {ev.description || "No desc"}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1">Populates account code automatically.</p>
                            </div>
                            <div>
                                <label className="label-text">Account Code</label>
                                <select {...register("accountCode")} className="select-field">
                                    <option value="">Select Account Code...</option>
                                    {accountOptions.map((acc: any) => (
                                        <option key={acc.id} value={acc.code}>{acc.code} - {acc.description}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="label-text">Select Credit Card</label>
                                <select {...register("creditCardNo")} className="select-field">
                                    <option value="">Select Corporate Card...</option>
                                    {cardOptions.map((card: any) => (
                                        <option key={card.id} value={card.card_no}>{card.card_name} ({card.card_no.slice(-4)})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Request Details */}
                <GlassCard>
                    <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pastel-mint text-emerald-700 flex items-center justify-center text-xs font-bold">2</span>
                        Request Details
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className="label-text">Objective</label>
                            <textarea
                                {...objectiveProps}
                                onChange={(e) => { e.target.value = normalizeThai(e.target.value); objectiveOnChange(e); }}
                                className="input-field min-h-[100px] resize-none"
                                placeholder="Describe the purpose of this card request..."
                                rows={3}
                            />
                            {errors.objective && <p className="text-red-400 text-xs mt-1">{errors.objective.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="label-text">Booking Date</label>
                                <input type="date" {...register("bookingDate")} className="input-field" />
                                {errors.bookingDate && <p className="text-red-400 text-xs mt-1">{errors.bookingDate.message}</p>}
                            </div>
                            <div>
                                <label className="label-text">Effective Date</label>
                                <input type="date" {...register("effectiveDate")} className="input-field" />
                                {errors.effectiveDate && <p className="text-red-400 text-xs mt-1">{errors.effectiveDate.message}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="label-text">Start Date</label>
                                <input type="date" {...register("startDate")} className="input-field" />
                                {errors.startDate && <p className="text-red-400 text-xs mt-1">{errors.startDate.message}</p>}
                            </div>
                            <div>
                                <label className="label-text">End Date</label>
                                <input type="date" {...register("endDate")} className="input-field" />
                                {errors.endDate && <p className="text-red-400 text-xs mt-1">{errors.endDate.message}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="label-text">Amount (THB)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register("amount")}
                                    className="input-field"
                                    placeholder="0.00"
                                />
                                {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>}
                            </div>
                            <div>
                                <label className="label-text">Billing Type</label>
                                <select {...register("billingType")} className="select-field">
                                    <option value="ONE_TIME">One-time</option>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="YEARLY">Yearly</option>
                                    <option value="YEARLY_MONTHLY">Yearly (Monthly Payments)</option>
                                </select>
                                {errors.billingType && <p className="text-red-400 text-xs mt-1">{errors.billingType.message}</p>}
                            </div>
                        </div>

                    </div>
                </GlassCard>

                {/* Promotional Channels */}
                <GlassCard>
                    <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pastel-purple text-purple-700 flex items-center justify-center text-xs font-bold">3</span>
                        Promotional Channels
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-4">
                        Select the advertising channels for this expense. For each selected channel, specify the media account and access details.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {PROMOTIONAL_CHANNELS.map((channel) => {
                            const isChecked = selectedChannels.has(channel);
                            return (
                                <button
                                    key={channel}
                                    type="button"
                                    onClick={() => handleChannelToggle(channel)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border
                                    ${isChecked 
                                        ? "bg-brand-50 border-brand-200 text-brand-700 shadow-sm" 
                                        : "bg-white dark:bg-gray-800/30 border-gray-100 dark:border-gray-800/50 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:border-brand-100"}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                    ${isChecked ? "bg-brand-500 border-brand-500" : "border-gray-300"}`}>
                                        {isChecked && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    {channel}
                                </button>
                            );
                        })}

                        {/* Custom Channels that were added */}
                        {Array.from(selectedChannels).filter(c => !PROMOTIONAL_CHANNELS.includes(c)).map((channel) => (
                            <button
                                key={channel}
                                type="button"
                                onClick={() => handleChannelToggle(channel)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border bg-brand-50 border-brand-200 text-brand-700 shadow-sm"
                            >
                                <div className="w-4 h-4 rounded border flex items-center justify-center transition-colors bg-brand-500 border-brand-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                {channel}
                            </button>
                        ))}

                        {showCustomInput ? (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <input 
                                    type="text" 
                                    className="input-field !py-1.5 !px-3 !text-sm w-32" 
                                    placeholder="Channel name..."
                                    value={customChannelName}
                                    onChange={(e) => setCustomChannelName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddCustomChannel();
                                        }
                                    }}
                                    autoFocus
                                />
                                <button 
                                    type="button" 
                                    onClick={handleAddCustomChannel}
                                    className="p-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setShowCustomInput(false)}
                                    className="p-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setShowCustomInput(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-brand-500 hover:text-brand-500"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                Add Other
                            </button>
                        )}
                    </div>

                    {fields.length > 0 && (
                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="bg-gradient-to-r from-brand-50/50 to-purple-50/50 rounded-xl p-5 border border-brand-100/50 animate-slide-up"
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2.5 py-1 rounded-lg bg-brand-100 text-brand-700 text-xs font-semibold">
                                            {field.channel}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="label-text">Media Account Email/ID</label>
                                            <input
                                                {...register(`promotionalChannels.${index}.mediaAccountEmail`)}
                                                className="input-field"
                                                placeholder="e.g. ads@company.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="label-text">Access List (Who has access?)</label>
                                            <input
                                                {...register(`promotionalChannels.${index}.accessList`)}
                                                className="input-field"
                                                placeholder="e.g. John, Sarah, Marketing Department"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </GlassCard>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" className="btn-secondary">
                        Save Draft
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Submitting...
                            </>
                        ) : (
                            <>
                                Submit Request
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

