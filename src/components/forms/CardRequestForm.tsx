"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PostSubmissionActions } from "@/components/forms/PostSubmissionActions";
import { normalizeThai } from "@/lib/utils/thai";
import { Project, EventMaster, AccountCodeMaster, CreditCardMaster } from "@/lib/types";
import {
    requestFormSchema,
    RequestFormData,
    PROMOTIONAL_CHANNELS,
} from "@/lib/validations/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
    Plus, 
    Trash2, 
    Save, 
    X, 
    CheckCircle2, 
    CreditCard, 
    Calendar, 
    User, 
    Briefcase, 
    Megaphone,
    ArrowRight,
    Loader2,
    Info,
    AlertCircle,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        watch,
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

    const { fields: channelFields, append: appendChannel, remove: removeChannel } = useFieldArray({
        control,
        name: "promotionalChannels",
    });

    // Fetch Master Data
    useEffect(() => {
        const fetchMasterData = async (): Promise<void> => {
            try {
                const resProjects = await fetch("/api/projects");
                if (resProjects.ok) setProjectOptions(await resProjects.json());

                const resEvents = await fetch("/api/master-data/events");
                if (resEvents.ok) setEventOptions(await resEvents.json());

                const resAccounts = await fetch("/api/master-data/accounts");
                if (resAccounts.ok) setAccountOptions(await resAccounts.json());

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
            const idx = channelFields.findIndex((f) => f.channel === channel);
            if (idx !== -1) removeChannel(idx);
        } else {
            newSelection.add(channel);
            appendChannel({ channel, mediaAccountEmail: "", accessList: "" });
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

    if (isSubmitted && submittedData) {
        return <div className="max-w-4xl mx-auto"><PostSubmissionActions formData={submittedData} /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            {/* Header Section */}
            <div className="space-y-2">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                    Authorization <span className="gradient-text">Directive</span>
                </h1>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                    Submit Financial Expenditure & Digital Resource Allocation
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {submitError && (
                    <Card className="border-red-100 bg-red-50/50 animate-in slide-in-from-top-4">
                        <CardContent className="p-4 flex items-center gap-4">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                            <p className="text-sm font-black text-red-700 uppercase tracking-tight">{submitError}</p>
                        </CardContent>
                    </Card>
                )}

                {/* Section 1: Personnel Attribution */}
                <Card glass className="border-none shadow-xl">
                    <CardContent className="p-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black shadow-lg">
                                01
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">Personnel Attribution</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">Requesting individual identifiers</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Legal Full Name</Label>
                                <Input
                                    {...register("fullName")}
                                    onChange={(e) => { e.target.value = normalizeThai(e.target.value); setValue("fullName", e.target.value); }}
                                    className="h-12 rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white transition-all font-bold"
                                    placeholder="Jane Doe"
                                />
                                {errors.fullName && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.fullName.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Internal Team</Label>
                                <Input
                                    {...register("department")}
                                    onChange={(e) => { e.target.value = normalizeThai(e.target.value); setValue("department", e.target.value); }}
                                    className="h-12 rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white transition-all font-bold"
                                    placeholder="Marketing Engineering"
                                />
                                {errors.department && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.department.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Direct Contact</Label>
                                <Input
                                    {...register("contactNo")}
                                    className="h-12 rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white transition-all font-mono font-bold"
                                    placeholder="+66 8x-xxx-xxxx"
                                />
                                {errors.contactNo && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.contactNo.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Corporate Mail</Label>
                                <Input
                                    {...register("email")}
                                    type="email"
                                    className="h-12 rounded-xl bg-gray-50/50 border-gray-100 focus:bg-white transition-all font-bold"
                                    placeholder="jane@organization.com"
                                />
                                {errors.email && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.email.message}</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 2: Project Allocation */}
                <Card glass className="border-none shadow-xl">
                    <CardContent className="p-8 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black shadow-lg">
                                02
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">Project Allocation</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">Cost center & specific identifiers</p>
                            </div>
                        </div>

                        <div className="space-y-10">
                            {/* Project Name */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Primary Project Context</Label>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingProject(!isAddingProject)} className="h-7 text-[10px] font-black tracking-widest uppercase text-brand-600">
                                        {isAddingProject ? <X className="w-3 h-3 mr-1.5" /> : <Plus className="w-3 h-3 mr-1.5" />}
                                        {isAddingProject ? "Decline" : "Register New"}
                                    </Button>
                                </div>
                                {isAddingProject ? (
                                    <div className="flex gap-3 animate-in slide-in-from-left-4">
                                        <Input 
                                            autoFocus
                                            className="h-12 rounded-xl bg-white border-brand-200 font-bold" 
                                            placeholder="Declare Project Identification..." 
                                            value={newProjectName}
                                            onChange={(e) => setNewProjectName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddProject(); } }}
                                        />
                                        <Button type="button" onClick={handleQuickAddProject} variant="brand" className="h-12 px-8 rounded-xl font-black uppercase tracking-widest text-xs">Save</Button>
                                    </div>
                                ) : (
                                    <Select 
                                        onValueChange={(val) => setValue("projectId", val)}
                                        value={watch("projectId")}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-100 font-bold">
                                            <SelectValue placeholder="Identify Target Project..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {projectOptions.map((p) => (
                                                <SelectItem key={p.id} value={p.id} className="font-medium">{p.project_name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                {errors.projectId && !isAddingProject && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.projectId.message}</p>}
                            </div>

                            {/* Dynamic Events Grid */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-brand-600" />
                                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">Discrete Event Components</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingEvent(!isAddingEvent)} className="h-8 text-[10px] font-black uppercase tracking-tight border-gray-100">
                                            {isAddingEvent ? "Collapse" : "+ ID"}
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingAccount(!isAddingAccount)} className="h-8 text-[10px] font-black uppercase tracking-tight border-gray-100">
                                            {isAddingAccount ? "Collapse" : "+ Account"}
                                        </Button>
                                    </div>
                                </div>

                                {/* Inline Adds */}
                                {isAddingEvent && (
                                    <div className="flex gap-3 p-5 rounded-2xl bg-brand-50/50 border border-brand-100 animate-in fade-in duration-500">
                                        <Input 
                                            autoFocus
                                            className="h-11 rounded-xl bg-white border-brand-200 font-mono text-xs" 
                                            placeholder="Discrete Event Code..." 
                                            value={newEventId}
                                            onChange={(e) => setNewEventId(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddEvent(); } }}
                                        />
                                        <Button type="button" onClick={handleQuickAddEvent} variant="brand" className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">Sync</Button>
                                    </div>
                                )}

                                {isAddingAccount && (
                                    <div className="flex gap-3 p-5 rounded-2xl bg-brand-50/50 border border-brand-100 animate-in fade-in duration-500">
                                        <Input 
                                            autoFocus
                                            className="h-11 rounded-xl bg-white border-brand-200 font-mono text-xs" 
                                            placeholder="Standard Account Code..." 
                                            value={newAccountCode}
                                            onChange={(e) => setNewAccountCode(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddAccount(); } }}
                                        />
                                        <Button type="button" onClick={handleQuickAddAccount} variant="brand" className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">Sync</Button>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {eventFields.map((field, index) => (
                                        <div key={field.id} className="relative grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                                            {eventFields.length > 1 && (
                                                <Button 
                                                    type="button"
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => removeEvent(index)}
                                                    className="absolute top-4 right-4 h-8 w-8 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Event Selection #{index + 1}</Label>
                                                <Select 
                                                    onValueChange={(val) => {
                                                        setValue(`eventDetails.${index}.eventId`, val);
                                                        const ev = eventOptions.find(opt => opt.event_id === val);
                                                        if (ev) setValue(`eventDetails.${index}.accountCode`, ev.account_code || "");
                                                    }}
                                                    value={watch(`eventDetails.${index}.eventId`)}
                                                >
                                                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-bold text-xs">
                                                        <SelectValue placeholder="Identify Event ID..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {eventOptions.map((ev) => (
                                                            <SelectItem key={ev.id} value={ev.event_id} className="text-xs font-medium">{ev.event_id} <span className="opacity-40">- {ev.description}</span></SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">Accounting Code #{index + 1}</Label>
                                                <Select 
                                                    onValueChange={(val) => setValue(`eventDetails.${index}.accountCode`, val)}
                                                    value={watch(`eventDetails.${index}.accountCode`)}
                                                >
                                                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-100 font-bold text-xs">
                                                        <SelectValue placeholder="Cost Allocation..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {accountOptions.map((acc) => (
                                                            <SelectItem key={acc.id} value={acc.code} className="text-xs font-medium">{acc.code} <span className="opacity-40">- {acc.description}</span></SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ))}

                                    <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={() => appendEvent({ eventId: "", accountCode: "" })}
                                        className="w-full h-14 border-2 border-dashed border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-brand-50/50 hover:border-brand-300 hover:text-brand-700 transition-all gap-3"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Append Logical Component ({eventFields.length}/20)
                                    </Button>
                                </div>
                            </div>

                            {/* Credit Card Selector */}
                            <div className="space-y-4 pt-4 border-t border-gray-50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Liability Attribution (Corporate Card)</Label>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingCard(!isAddingCard)} className="h-7 text-[10px] font-black tracking-widest uppercase text-brand-600">
                                        {isAddingCard ? "Decline" : "+ Register Instrument"}
                                    </Button>
                                </div>
                                {isAddingCard ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in slide-in-from-top-4">
                                        <Input 
                                            autoFocus
                                            className="h-12 rounded-xl bg-white border-brand-200 font-bold" 
                                            placeholder="Provider (e.g. AMEX)" 
                                            value={newCardName}
                                            onChange={(e) => setNewCardName(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <Input 
                                                className="h-12 rounded-xl bg-white border-brand-200 font-mono italic" 
                                                placeholder="Last 4 Digits..." 
                                                value={newCardNo}
                                                onChange={(e) => setNewCardNo(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddCard(); } }}
                                            />
                                            <Button type="button" onClick={handleQuickAddCard} variant="brand" className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">Sync</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Select 
                                        onValueChange={(val) => setValue("creditCardNo", val)}
                                        value={watch("creditCardNo")}
                                    >
                                        <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-100 font-bold">
                                            <SelectValue placeholder="Identify Financial Instrument..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {cardOptions.map((c) => (
                                                <SelectItem key={c.id} value={c.card_no} className="font-medium">{c.card_no} <span className="opacity-40">- {c.card_name}</span></SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 3: Expenditure Logic */}
                <Card glass className="border-none shadow-xl">
                    <CardContent className="p-8 space-y-10">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg">
                                03
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">Expenditure Details</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">Objectives & temporal parameters</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Operational Objective</Label>
                                <Textarea
                                    {...register("objective")}
                                    onChange={(e) => { e.target.value = normalizeThai(e.target.value); setValue("objective", e.target.value); }}
                                    className="min-h-[120px] rounded-2xl bg-gray-50/50 border-gray-100 focus:bg-white transition-all font-bold p-5 resize-none leading-relaxed"
                                    placeholder="Provide a comprehensive narrative for auditors & management review..."
                                />
                                {errors.objective && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.objective.message}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Booking Directive Date</Label>
                                    <div className="relative">
                                        <Input type="date" {...register("bookingDate")} className="h-12 rounded-xl bg-gray-50/50 border-gray-100 font-bold px-10" />
                                        <Calendar className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-brand-600 opacity-50" />
                                    </div>
                                    {errors.bookingDate && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.bookingDate.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Activation Date</Label>
                                    <div className="relative">
                                        <Input type="date" {...register("effectiveDate")} className="h-12 rounded-xl bg-gray-50/50 border-gray-100 font-bold px-10" />
                                        <Calendar className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-brand-600 opacity-50" />
                                    </div>
                                    {errors.effectiveDate && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.effectiveDate.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Timeline Commencement</Label>
                                    <div className="relative">
                                        <Input type="date" {...register("startDate")} className="h-12 rounded-xl bg-gray-50/50 border-gray-100 font-bold px-10" />
                                        <Clock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-indigo-600 opacity-50" />
                                    </div>
                                    {errors.startDate && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.startDate.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Timeline Termination</Label>
                                    <div className="relative">
                                        <Input type="date" {...register("endDate")} className="h-12 rounded-xl bg-gray-50/50 border-gray-100 font-bold px-10" />
                                        <Clock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-indigo-600 opacity-50" />
                                    </div>
                                    {errors.endDate && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.endDate.message}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-gray-50 pt-8">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Allocated Quantum (THB)</Label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-xs font-black text-gray-400">฿</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            {...register("amount")}
                                            className="h-14 rounded-2xl bg-white border-brand-200 focus:ring-4 focus:ring-brand-50 transition-all font-black text-xl pl-10"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    {errors.amount && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.amount.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Expenditure Model</Label>
                                    <Select 
                                        onValueChange={(val) => setValue("billingType", val as any)}
                                        value={watch("billingType")}
                                    >
                                        <SelectTrigger className="h-14 rounded-2xl bg-gray-50/50 border-gray-100 font-black text-xs uppercase tracking-widest">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="ONE_TIME" className="font-bold uppercase tracking-tight text-[10px]">One-time Injection</SelectItem>
                                            <SelectItem value="MONTHLY" className="font-bold uppercase tracking-tight text-[10px]">Monthly Recurrence</SelectItem>
                                            <SelectItem value="YEARLY" className="font-bold uppercase tracking-tight text-[10px]">Annual Cycle</SelectItem>
                                            <SelectItem value="YEARLY_MONTHLY" className="font-bold uppercase tracking-tight text-[10px]">Annual (Hybrid Management)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.billingType && <p className="text-red-500 text-[10px] font-black uppercase italic tracking-widest">{errors.billingType.message}</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Section 4: Resource Distribution */}
                <Card glass className="border-none shadow-xl border-t-4 border-brand-500/50">
                    <CardContent className="p-8 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shadow-lg">
                                04
                            </div>
                            <div className="space-y-0.5">
                                <h2 className="text-base font-black text-gray-900 uppercase tracking-widest">Resource Distribution</h2>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">Promotional channels & digital access nodes</p>
                            </div>
                        </div>

                        <div className="bg-purple-50/30 p-5 rounded-2xl flex items-start gap-4 border border-purple-100/50">
                            <Megaphone className="w-6 h-6 text-purple-600 shrink-0 mt-1" />
                            <p className="text-[11px] font-bold text-purple-800/80 leading-relaxed uppercase tracking-tighter">
                                Identify targeted nodes for this expenditure. Each selected channel requires verified media account identifiers and explicit user access matrices.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {PROMOTIONAL_CHANNELS.map((channel) => {
                                const isChecked = selectedChannels.has(channel);
                                return (
                                    <button
                                        key={channel}
                                        type="button"
                                        onClick={() => handleChannelToggle(channel)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-500 text-left group overflow-hidden relative",
                                            isChecked 
                                                ? "bg-brand-50 border-brand-500 shadow-md shadow-brand/10" 
                                                : "bg-white border-gray-50 hover:border-brand-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-500",
                                            isChecked ? "bg-brand-500 border-brand-500 scale-110" : "border-gray-200 bg-gray-50"
                                        )}>
                                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className={cn(
                                            "text-xs font-black uppercase tracking-tight",
                                            isChecked ? "text-brand-900" : "text-muted-foreground"
                                        )}>{channel}</span>
                                    </button>
                                );
                            })}
                            
                            {/* Dynamic Custom Channels */}
                            {Array.from(selectedChannels).filter(c => !PROMOTIONAL_CHANNELS.includes(c)).map((channel) => (
                                <button
                                    key={channel}
                                    type="button"
                                    onClick={() => handleChannelToggle(channel)}
                                    className="flex items-center gap-3 p-4 rounded-2xl border-2 bg-brand-50 border-brand-500 shadow-md shadow-brand/10 transition-all duration-500"
                                >
                                    <div className="w-5 h-5 rounded-lg bg-brand-500 border-2 border-brand-500 flex items-center justify-center">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    </div>
                                    <span className="text-xs font-black uppercase tracking-tight text-brand-900">{channel}</span>
                                </button>
                            ))}

                            {/* Add Other Interface */}
                            {showCustomInput ? (
                                <div className="flex items-center gap-2 animate-in zoom-in-95 duration-500">
                                    <Input
                                        className="h-12 rounded-xl bg-white border-brand-300 font-bold text-xs"
                                        placeholder="Channel..."
                                        value={customChannelName}
                                        onChange={(e) => setCustomChannelName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomChannel(); } }}
                                        autoFocus
                                    />
                                    <Button type="button" size="icon" onClick={handleAddCustomChannel} variant="brand" className="h-12 w-12 rounded-xl"><Plus className="w-5 h-5" /></Button>
                                    <Button type="button" size="icon" onClick={() => setShowCustomInput(false)} variant="ghost" className="h-12 w-12 rounded-xl"><X className="w-5 h-5" /></Button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowCustomInput(true)}
                                    className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50/50 transition-all duration-500"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Append Slot</span>
                                </button>
                            )}
                        </div>

                        {/* Detail Inputs for selected channels */}
                        {channelFields.length > 0 && (
                            <div className="space-y-6 pt-6 animate-in slide-in-from-bottom-10 duration-700">
                                {channelFields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="relative bg-gradient-to-br from-brand-50/20 to-indigo-50/10 rounded-3xl p-8 border border-white/50 shadow-sm"
                                    >
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 border border-brand-100 mb-6 group cursor-default">
                                            <Badge variant="brand" className="rounded-lg h-5 text-[9px] font-black uppercase tracking-tight">{field.channel}</Badge>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Access Configuration</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Media Account Email/ID</Label>
                                                <Input
                                                    {...register(`promotionalChannels.${index}.mediaAccountEmail`)}
                                                    className="h-12 rounded-xl bg-white border-white focus:border-brand-200 transition-all font-bold"
                                                    placeholder="ads@corporate-entity.com"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Permission Matrix (Who Has Entry?)</Label>
                                                <Input
                                                    {...register(`promotionalChannels.${index}.accessList`)}
                                                    className="h-12 rounded-xl bg-white border-white focus:border-brand-200 transition-all font-bold"
                                                    placeholder="John, Sarah (Marketing Analytics)"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Final Submission Control */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        className="h-16 flex-1 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border border-gray-100 hover:bg-gray-50/50"
                    >
                        Archive as Provisional Draft
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        variant="brand"
                        className={cn(
                            "h-16 flex-[2] rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-brand/30 transition-all hover:scale-[1.01] active:scale-[0.99]",
                            isSubmitting && "opacity-80"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin mr-3" />
                                Processing Directive...
                            </>
                        ) : (
                            <>
                                Initialize Final Submission
                                <ArrowRight className="w-5 h-5 ml-3" />
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
