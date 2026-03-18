"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlassCard } from "@/components/ui/GlassCard";
import { PostSubmissionActions } from "@/components/forms/PostSubmissionActions";
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
    const [projectSearch, setProjectSearch] = useState("");
    const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const projectRef = useRef<HTMLDivElement>(null);

    const {
        register,
        handleSubmit,
        control,
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
            promotionalChannels: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "promotionalChannels",
    });

    // Fetch projects for autocomplete
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const res = await fetch(`/api/projects?search=${encodeURIComponent(projectSearch)}`);
                if (res.ok) {
                    const data = await res.json();
                    setProjectOptions(data);
                }
            } catch {
                // Ignore
            }
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
            const idx = fields.findIndex((f) => f.channel === channel);
            if (idx !== -1) remove(idx);
        } else {
            newSelection.add(channel);
            append({ channel, mediaAccountEmail: "", accessList: "" });
        }
        setSelectedChannels(newSelection);
    };

    const normalizeThai = (text: string = "") => {
        if (!text) return "";
        return text
            .normalize("NFC")
            // reorder tone + vowel (ครอบคลุมมากขึ้น)
            .replace(/([\u0E48-\u0E4C]+)([\u0E31-\u0E3A\u0E34-\u0E39]+)/g, "$2$1")
            // fix นำา → นำ
            .replace(/\u0E33\u0E32/g, "\u0E33")
            // fix common broken patterns
            .replace(/เ([่-๋])([ก-ฮ])/g, "เ$2$1");
    };

    const onSubmit = async (data: RequestFormData) => {
        setSubmitError(null);

        // ✅ Sanitize object recursively
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

        const requestBody = {
            ...cleanData,
            projectName: normalizeThai(projectSearch),
            userId: null,
            projectId: selectedProjectId,
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

    if (isSubmitted && submittedData) {
        return <PostSubmissionActions formData={submittedData} />;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    New Card <span className="gradient-text">Request</span>
                </h1>
                <p className="text-sm text-gray-500">
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
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">1</span>
                        Personal Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="label-text">Full Name</label>
                            <input {...register("fullName")} className="input-field" placeholder="Enter your full name" />
                            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
                        </div>
                        <div>
                            <label className="label-text">Team</label>
                            <input {...register("department")} className="input-field" placeholder="e.g. Web Developer" />
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
                        <div ref={projectRef} className="relative">
                            <label className="label-text">Project Name (type to search or create)</label>
                            <input
                                type="text"
                                value={projectSearch}
                                onChange={(e) => {
                                    setProjectSearch(e.target.value);
                                    setShowProjectDropdown(true);
                                    setSelectedProjectId(null);
                                }}
                                onFocus={() => setShowProjectDropdown(true)}
                                className="input-field"
                                placeholder="Type project name..."
                            />
                            <input type="hidden" {...register("projectId")} value={selectedProjectId || ""} />

                            {showProjectDropdown && projectSearch && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                    {projectOptions.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setProjectSearch(p.project_name);
                                                setSelectedProjectId(p.id);
                                                setShowProjectDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                                        >
                                            {p.project_name}
                                        </button>
                                    ))}
                                    {projectOptions.length === 0 && (
                                        <div className="px-4 py-3 text-sm text-gray-400">
                                            No matching projects — this name will create a new project
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.projectId && <p className="text-red-400 text-xs mt-1">{errors.projectId.message}</p>}
                        </div>
                    </div>
                </GlassCard>

                {/* Request Details */}
                <GlassCard>
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pastel-mint text-emerald-700 flex items-center justify-center text-xs font-bold">2</span>
                        Request Details
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className="label-text">Objective</label>
                            <textarea
                                {...register("objective")}
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
                    <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pastel-purple text-purple-700 flex items-center justify-center text-xs font-bold">3</span>
                        Promotional Channels
                    </h2>
                    <p className="text-xs text-gray-400 mb-4">
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
                                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 flex items-center gap-2
                                    ${isChecked
                                            ? "bg-brand-50 border-brand-300 text-brand-700 shadow-sm"
                                            : "bg-white/60 border-gray-200 text-gray-500 hover:border-brand-200 hover:text-brand-500"
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all
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
