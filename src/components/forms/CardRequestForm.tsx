"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlassCard } from "@/components/ui/GlassCard";
import { PostSubmissionActions } from "@/components/forms/PostSubmissionActions";
import { normalizeThai } from "@/lib/thai-utils";
import { supabase } from "@/lib/supabase";
import { Project, EventMaster, AccountCodeMaster, CreditCardMaster } from "@/lib/types";
import {
    requestFormSchema,
    RequestFormData,
    PROMOTIONAL_CHANNELS,
} from "@/lib/validations/schema";

export function CardRequestForm() {
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [submittedData, setSubmittedData] = useState<RequestFormData | null>(null);
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
    const [projectOptions, setProjectOptions] = useState<Project[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [eventOptions, setEventOptions] = useState<EventMaster[]>([]);
    const [accountOptions, setAccountOptions] = useState<AccountCodeMaster[]>([]);
    const [cardOptions, setCardOptions] = useState<CreditCardMaster[]>([]);
    const [customChannelName, setCustomChannelName] = useState<string>("");
    const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

    // Inline Add States
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [newProjectName, setNewProjectName] = useState("");

    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEventId, setNewEventId] = useState("");

    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountCode, setNewAccountCode] = useState("");

    const [isAddingCard, setIsAddingCard] = useState(false);
    const [newCardNo, setNewCardNo] = useState("");
    const [newCardName, setNewCardName] = useState("");

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
            eventDetails: [{ eventId: "", accountCode: "" }],
            promotionalChannels: [],
        },
    });

    const { 
        fields: eventFields, 
        append: appendEvent, 
        remove: removeEvent 
    } = useFieldArray({
        control,
        name: "eventDetails",
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "promotionalChannels",
    });

    // Fetch Master Data
    useEffect(() => {
        const fetchMasterData = async (): Promise<void> => {
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

    const handleChannelToggle = (channel: string): void => {
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

    const handleAddCustomChannel = (): void => {
        if (!customChannelName.trim()) return;
        const channel = customChannelName.trim();
        if (!selectedChannels.has(channel)) {
            handleChannelToggle(channel);
        }
        setCustomChannelName("");
        setShowCustomInput(false);
    };

    // Quick Add Handlers
    const handleQuickAddProject = async () => {
        if (!newProjectName.trim()) return;
        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectName: newProjectName.trim() }),
            });
            if (res.ok) {
                const added = await res.json();
                setProjectOptions([added, ...projectOptions]);
                setValue("projectId", added.id);
                setIsAddingProject(false);
                setNewProjectName("");
            } else {
                const errData = await res.json();
                alert(`Failed to add project: ${errData.error || "Unknown error"}`);
            }
        } catch (error: any) { alert(`Error: ${error.message}`); console.error(error); }
    };

    const handleQuickAddEvent = async () => {
        if (!newEventId.trim()) return;
        try {
            const res = await fetch("/api/master-data/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ eventId: newEventId.trim(), description: "Quick Added" }),
            });
            if (res.ok) {
                const added = await res.json();
                setEventOptions([added, ...eventOptions]);
                setIsAddingEvent(false);
                setNewEventId("");
            } else {
                const errData = await res.json();
                alert(`Failed to add Event ID: ${errData.error || "Unknown error"}`);
            }
        } catch (error: any) { alert(`Error: ${error.message}`); console.error(error); }
    };

    const handleQuickAddAccount = async () => {
        if (!newAccountCode.trim()) return;
        try {
            const res = await fetch("/api/master-data/accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: newAccountCode.trim(), description: "Quick Added" }),
            });
            if (res.ok) {
                const added = await res.json();
                setAccountOptions([added, ...accountOptions]);
                setValue("accountCode", added.code);
                setIsAddingAccount(false);
                setNewAccountCode("");
            } else {
                const errData = await res.json();
                alert(`Failed to add Account Code: ${errData.error || "Unknown error"}`);
            }
        } catch (error: any) { alert(`Error: ${error.message}`); console.error(error); }
    };

    const handleQuickAddCard = async () => {
        if (!newCardNo.trim() || !newCardName.trim()) return;
        try {
            const res = await fetch("/api/master-data/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cardNo: newCardNo.trim(), cardName: newCardName.trim(), description: "Quick Added" }),
            });
            if (res.ok) {
                const added = await res.json();
                setCardOptions([added, ...cardOptions]);
                setValue("creditCardNo", added.card_no);
                setIsAddingCard(false);
                setNewCardNo("");
                setNewCardName("");
            } else {
                const errData = await res.json();
                alert(`Failed to add Credit Card: ${errData.error || "Unknown error"}`);
            }
        } catch (error: any) { alert(`Error: ${error.message}`); console.error(error); }
    };

    const onSubmit = async (data: RequestFormData): Promise<void> => {
        setSubmitError(null);

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

        const selectedProject = projectOptions.find((p: Project) => p.id === cleanData.projectId);

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
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { e.target.value = normalizeThai(e.target.value); fullNameOnChange(e); }}
                                className="input-field"
                                placeholder="Enter your full name"
                            />
                            {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
                        </div>
                        <div>
                            <label className="label-text">Team</label>
                            <input
                                {...departmentProps}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { e.target.value = normalizeThai(e.target.value); departmentOnChange(e); }}
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
                    </div>
                </GlassCard>

                <GlassCard>
                    <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pastel-blue text-brand-700 flex items-center justify-center text-xs font-bold">2</span>
                        Project & Master Data
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className="label-text flex items-center justify-between">
                                Project Name
                                <button type="button" onClick={() => setIsAddingProject(!isAddingProject)} className="text-[10px] text-brand-600 font-bold hover:underline bg-brand-50 px-2 py-0.5 rounded">
                                    {isAddingProject ? "Cancel" : "+ New"}
                                </button>
                            </label>
                            {isAddingProject ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="input-field py-2 text-sm" 
                                        placeholder="Type new project name..." 
                                        value={newProjectName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)}
                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddProject(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddProject} className="btn-primary px-3 py-2 min-w-[70px] text-xs">Save</button>
                                </div>
                            ) : (
                                <select {...register("projectId")} className="select-field">
                                    <option value="">Select a project...</option>
                                    {projectOptions.map((p: Project) => (
                                        <option key={p.id} value={p.id}>{p.project_name}</option>
                                    ))}
                                </select>
                            )}
                            {errors.projectId && !isAddingProject && <p className="text-red-400 text-xs mt-1">{errors.projectId.message}</p>}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="label-text">Event & Account Details</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsAddingEvent(!isAddingEvent)} className="text-[10px] text-brand-600 font-bold hover:underline bg-brand-50 px-2 py-0.5 rounded">
                                        {isAddingEvent ? "Close Event Add" : "+ Quick Event"}
                                    </button>
                                    <button type="button" onClick={() => setIsAddingAccount(!isAddingAccount)} className="text-[10px] text-brand-600 font-bold hover:underline bg-brand-50 px-2 py-0.5 rounded">
                                        {isAddingAccount ? "Close Account Add" : "+ Quick Account"}
                                    </button>
                                </div>
                            </div>

                            {isAddingEvent && (
                                <div className="flex gap-2 p-3 bg-brand-50/50 rounded-xl border border-brand-100 animate-slide-down">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="input-field py-1.5 text-xs" 
                                        placeholder="New Event ID..." 
                                        value={newEventId}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEventId(e.target.value)}
                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddEvent(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddEvent} className="btn-primary px-3 py-1.5 min-w-[60px] text-[10px]">Save Event</button>
                                </div>
                            )}

                            {isAddingAccount && (
                                <div className="flex gap-2 p-3 bg-brand-50/50 rounded-xl border border-brand-100 animate-slide-down">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="input-field py-1.5 text-xs" 
                                        placeholder="New Account Code..." 
                                        value={newAccountCode}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAccountCode(e.target.value)}
                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddAccount(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddAccount} className="btn-primary px-3 py-1.5 min-w-[60px] text-[10px]">Save Account</button>
                                </div>
                            )}

                            <div className="space-y-3">
                                {eventFields.map((field: any, index: number) => (
                                    <div key={field.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 relative group shadow-sm transition-all hover:shadow-md">
                                        {eventFields.length > 1 && (
                                            <button 
                                                type="button"
                                                onClick={() => removeEvent(index)}
                                                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1 block">Event ID #{index + 1}</label>
                                                <select
                                                    {...register(`eventDetails.${index}.eventId`)}
                                                    className="select-field !py-2 !text-xs"
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                        const val = e.target.value;
                                                        const ev = eventOptions.find((opt: EventMaster) => opt.event_id === val);
                                                        if (ev) setValue(`eventDetails.${index}.accountCode`, ev.account_code || "");
                                                        const { onChange } = register(`eventDetails.${index}.eventId`);
                                                        onChange(e);
                                                    }}
                                                >
                                                    <option value="">Select Event...</option>
                                                    {eventOptions.map((ev: EventMaster) => (
                                                        <option key={ev.id} value={ev.event_id}>{ev.event_id} - {ev.description || "No desc"}</option>
                                                    ))}
                                                </select>
                                                {errors.eventDetails?.[index]?.eventId && <p className="text-red-400 text-[10px] mt-1">{errors.eventDetails[index]?.eventId?.message}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1 block">Account Code #{index + 1}</label>
                                                <select 
                                                    {...register(`eventDetails.${index}.accountCode`)} 
                                                    className="select-field !py-2 !text-xs"
                                                >
                                                    <option value="">Select Account...</option>
                                                    {accountOptions.map((acc: AccountCodeMaster) => (
                                                        <option key={acc.id} value={acc.code}>{acc.code} - {acc.description}</option>
                                                    ))}
                                                </select>
                                                {errors.eventDetails?.[index]?.accountCode && <p className="text-red-400 text-[10px] mt-1">{errors.eventDetails[index]?.accountCode?.message}</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {eventFields.length < 20 && (
                                    <button 
                                        type="button"
                                        onClick={() => appendEvent({ eventId: "", accountCode: "" })}
                                        className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-400 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        Add Another Event / Account Pair ({eventFields.length}/20)
                                    </button>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="label-text flex items-center justify-between">
                                Select Credit Card
                                <button type="button" onClick={() => setIsAddingCard(!isAddingCard)} className="text-[10px] text-brand-600 font-bold hover:underline bg-brand-50 px-2 py-0.5 rounded">
                                    {isAddingCard ? "Cancel" : "+ New"}
                                </button>
                            </label>
                            {isAddingCard ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="input-field py-2 text-sm w-1/2" 
                                        placeholder="Name (e.g. AMEX)" 
                                        value={newCardName}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCardName(e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        className="input-field py-2 text-sm w-1/2" 
                                        placeholder="Card No (e.g. 1234)" 
                                        value={newCardNo}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCardNo(e.target.value)}
                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddCard(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddCard} className="btn-primary px-3 py-2 min-w-[70px] text-xs">Save</button>
                                </div>
                            ) : (
                                <select {...register("creditCardNo")} className="select-field">
                                    <option value="">Select Corporate Card...</option>
                                    {cardOptions.map((c: CreditCardMaster) => (
                                        <option key={c.id} value={c.card_no}>{c.card_no} - {c.card_name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pastel-mint text-emerald-700 flex items-center justify-center text-xs font-bold">3</span>
                        Request Details
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label className="label-text">Objective</label>
                            <textarea
                                {...objectiveProps}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => { e.target.value = normalizeThai(e.target.value); objectiveOnChange(e); }}
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

                <GlassCard>
                    <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-5 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-pastel-purple text-purple-700 flex items-center justify-center text-xs font-bold">4</span>
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
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border
                                    ${isChecked
                                            ? "bg-brand-50 border-brand-200 text-brand-700 shadow-sm"
                                            : "bg-white dark:bg-gray-800/30 border-gray-100 dark:border-gray-800/50 text-gray-500 hover:border-brand-100"}`}
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomChannelName(e.target.value)}
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
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

