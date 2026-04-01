"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord, Project, EventMaster, AccountCodeMaster, CreditCardMaster } from "@/lib/types";
import { PROMOTIONAL_CHANNELS } from "@/lib/validations/schema";
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
    X, 
    CheckCircle2, 
    CreditCard, 
    Calendar, 
    Briefcase, 
    Megaphone,
    Loader2,
    Info,
    AlertCircle,
    Search,
    Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: RequestRecord | null;
    onSuccess?: () => void;
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
    const [promotionalChannels, setPromotionalChannels] = useState<any[]>([]);
    const [customChannelName, setCustomChannelName] = useState("");
    const [showCustomInput, setShowCustomInput] = useState(false);
    
    // Project Search States
    const [projectSearch, setProjectSearch] = useState("");
    const [projectOptions, setProjectOptions] = useState<Project[]>([]);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const projectRef = useRef<HTMLDivElement>(null);

    const [requestId, setRequestId] = useState("");
    const [creditCardNo, setCreditCardNo] = useState("");

    // Master Data Options
    const [eventOptions, setEventOptions] = useState<EventMaster[]>([]);
    const [accountOptions, setAccountOptions] = useState<AccountCodeMaster[]>([]);
    const [cardOptions, setCardOptions] = useState<CreditCardMaster[]>([]);

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

    const [eventDetails, setEventDetails] = useState<{ eventId: string, accountCode: string }[]>([{ eventId: "", accountCode: "" }]);

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
            setRequestId(request.req_id || "");
            setCreditCardNo(request.credit_card_no || "");
            
            if (Array.isArray(request.event_details) && request.event_details.length > 0) {
                setEventDetails(request.event_details.map((ed: any) => ({
                    eventId: ed.eventId || ed.reqId || "",
                    accountCode: ed.accountCode || ""
                })));
            } else {
                setEventDetails([{ eventId: (request as any).event_id || "", accountCode: request.account_code || "" }]);
            }
            
            const channels = Array.isArray(request.promotional_channels) ? request.promotional_channels : [];
            setPromotionalChannels(channels);
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

    // Fetch other Master Data on mount
    useEffect(() => {
        if (!isOpen) return;
        const fetchMasterData = async () => {
            try {
                const resEvents = await fetch("/api/master-data/events");
                if (resEvents.ok) setEventOptions(await resEvents.json());

                const resAccounts = await fetch("/api/master-data/accounts");
                if (resAccounts.ok) setAccountOptions(await resAccounts.json());

                const resCards = await fetch("/api/master-data/cards");
                if (resCards.ok) setCardOptions(await resCards.json());
            } catch (err) { console.error("Master data fetch failed:", err); }
        };
        fetchMasterData();
    }, [isOpen]);

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
                setProjectSearch(added.project_name);
                setSelectedProjectId(added.id);
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
                setCreditCardNo(added.card_no);
                setIsAddingCard(false);
                setNewCardNo("");
                setNewCardName("");
            } else {
                const errData = await res.json();
                alert(`Failed to add Credit Card: ${errData.error || "Unknown error"}`);
            }
        } catch (error: any) { alert(`Error: ${error.message}`); console.error(error); }
    };

    const handleChannelToggle = (channel: string) => {
        setPromotionalChannels((prev: any[]) => {
            const exists = prev.find((c: any) => c.channel === channel);
            if (exists) {
                return prev.filter((c: any) => c.channel !== channel);
            }
            return [...prev, { channel, mediaAccountEmail: "", accessList: "" }];
        });
    };

    const updateChannelDetail = (index: number, field: string, value: string) => {
        setPromotionalChannels((prev: any[]) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleAddCustomChannel = () => {
        if (!customChannelName.trim()) return;
        if (promotionalChannels.some(c => c.channel === customChannelName.trim())) {
            setCustomChannelName("");
            setShowCustomInput(false);
            return;
        }
        setPromotionalChannels(prev => [...prev, { channel: customChannelName.trim(), mediaAccountEmail: "", accessList: "" }]);
        setCustomChannelName("");
        setShowCustomInput(false);
    };

    const addEventRow = () => {
        if (eventDetails.length < 20) {
            setEventDetails([...eventDetails, { eventId: "", accountCode: "" }]);
        }
    };

    const removeEventRow = (index: number) => {
        if (eventDetails.length > 1) {
            setEventDetails(eventDetails.filter((_, i) => i !== index));
        }
    };

    const updateEventDetail = (index: number, field: "eventId" | "accountCode", value: string) => {
        const newDetails = [...eventDetails];
        newDetails[index][field] = value;
        if (field === "eventId") {
            const ev = eventOptions.find(opt => opt.event_id === value);
            if (ev && ev.account_code) {
                newDetails[index].accountCode = ev.account_code;
            }
        }
        setEventDetails(newDetails);
    };

    const handleSave = async () => {
        if (!request) return;
        setSaving(true);
        setError("");
        try {
            const body = {
                full_name: fullName,
                department,
                objective,
                project_id: selectedProjectId,
                project_name: projectSearch,
                amount: parseFloat(amount),
                contact_no: contactNo,
                email,
                billing_type: billingType,
                start_date: startDate,
                end_date: endDate,
                booking_date: bookingDate,
                effective_date: effectiveDate,
                promotional_channels: promotionalChannels,
                account_code: eventDetails[0]?.accountCode || "",
                event_id: eventDetails[0]?.eventId || "",
                event_details: eventDetails,
                credit_card_no: creditCardNo
            };

            const res = await fetch(`/api/requests/${request.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
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
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Management Interface" 
            maxWidth="max-w-4xl"
        >
            <div className="space-y-8 max-h-[75vh] overflow-y-auto px-1 pb-10 custom-scrollbar">
                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-xs font-black text-red-700 uppercase tracking-tight">{error}</p>
                    </div>
                )}

                {/* Section 1: Personnel Attribution */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-brand-500 text-white flex items-center justify-center font-black shadow-lg text-[10px]">01</div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Personnel Attribution</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Record Reference</Label>
                            <Input value={requestId} disabled className="h-11 rounded-xl bg-gray-50 border-gray-100 font-mono font-bold text-xs opacity-50 transition-none" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Legal Full Name</Label>
                            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl font-bold text-sm" placeholder="Full Name" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Internal Team</Label>
                            <Input value={department} onChange={(e) => setDepartment(e.target.value)} className="h-11 rounded-xl font-bold text-sm" placeholder="Department" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Direct Contact</Label>
                            <Input value={contactNo} onChange={(e) => setContactNo(e.target.value)} className="h-11 rounded-xl font-mono font-bold text-sm" placeholder="+66 8x-xxx-xxxx" />
                        </div>
                        <div className="space-y-1.5 col-span-full">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Corporate Mail Profile</Label>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-11 rounded-xl font-bold text-sm" placeholder="email@organization.com" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Project Allocation */}
                <div className="space-y-6 pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black shadow-lg text-[10px]">02</div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Allocation & Budget</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Project Autocomplete */}
                        <div className="space-y-3 relative" ref={projectRef}>
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Target Project Context</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingProject(!isAddingProject)} className="h-6 text-[9px] font-black uppercase tracking-widest text-brand-600">
                                    {isAddingProject ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                                    {isAddingProject ? "Decline" : "Register New"}
                                </Button>
                            </div>
                            {isAddingProject ? (
                                <div className="flex gap-2 animate-in slide-in-from-left-4">
                                    <Input autoFocus className="h-11 rounded-xl font-bold" placeholder="Identify Project..." value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddProject(); } }} />
                                    <Button onClick={handleQuickAddProject} variant="brand" className="h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]">Save</Button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <Input value={projectSearch} onChange={(e) => { setProjectSearch(e.target.value); setShowProjectDropdown(true); }} onFocus={() => setShowProjectDropdown(true)} className="h-11 rounded-xl font-bold" placeholder="Identify Project..." />
                                    {showProjectDropdown && projectOptions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            {projectOptions.map(p => (
                                                <button key={p.id} onClick={() => { setProjectSearch(p.project_name); setSelectedProjectId(p.id); setShowProjectDropdown(false); }} className="w-full text-left px-5 py-3 hover:bg-brand-50 text-sm font-bold transition-colors border-b border-gray-50 last:border-0">{p.project_name}</button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Budget Allocation (THB)</Label>
                            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-xl font-black text-lg" placeholder="0.00" />
                        </div>

                        {/* Events Grid */}
                        <div className="col-span-full space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-brand-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Event-Accounting Matrix</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingEvent(!isAddingEvent)} className="h-7 text-[9px] font-black uppercase tracking-tight border-gray-100">{isAddingEvent ? "Collapse" : "+ ID"}</Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAddingAccount(!isAddingAccount)} className="h-7 text-[9px] font-black uppercase tracking-tight border-gray-100">{isAddingAccount ? "Collapse" : "+ Account"}</Button>
                                </div>
                            </div>

                            {isAddingEvent && (
                                <div className="flex gap-2 p-4 bg-brand-50/50 rounded-2xl border border-brand-100 animate-in fade-in">
                                    <Input autoFocus className="h-10 rounded-xl bg-white font-mono text-xs" placeholder="New Event Code..." value={newEventId} onChange={(e) => setNewEventId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddEvent(); } }} />
                                    <Button onClick={handleQuickAddEvent} variant="brand" className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[9px]">Sync</Button>
                                </div>
                            )}

                            {isAddingAccount && (
                                <div className="flex gap-2 p-4 bg-brand-50/50 rounded-2xl border border-brand-100 animate-in fade-in">
                                    <Input autoFocus className="h-10 rounded-xl bg-white font-mono text-xs" placeholder="New Account Code..." value={newAccountCode} onChange={(e) => setNewAccountCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddAccount(); } }} />
                                    <Button onClick={handleQuickAddAccount} variant="brand" className="h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[9px]">Sync</Button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {eventDetails.map((ed, idx) => (
                                    <div key={idx} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm relative group">
                                        {eventDetails.length > 1 && (
                                            <Button variant="ghost" size="icon" onClick={() => removeEventRow(idx)} className="absolute top-2 right-2 h-7 w-7 rounded-xl text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></Button>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Event Selection #{idx + 1}</Label>
                                                <Select value={ed.eventId} onValueChange={(val) => updateEventDetail(idx, "eventId", val)}>
                                                    <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-50 font-bold text-xs"><SelectValue placeholder="Identify Event..." /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {eventOptions.map(ev => <SelectItem key={ev.id} value={ev.event_id} className="text-xs font-medium">{ev.event_id} <span className="opacity-40">- {ev.description}</span></SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Accounting Node #{idx + 1}</Label>
                                                <Select value={ed.accountCode} onValueChange={(val) => updateEventDetail(idx, "accountCode", val)}>
                                                    <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-50 font-bold text-xs"><SelectValue placeholder="Cost Allocation..." /></SelectTrigger>
                                                    <SelectContent className="rounded-xl">
                                                        {accountOptions.map(acc => <SelectItem key={acc.id} value={acc.code} className="text-xs font-medium">{acc.code} <span className="opacity-40">- {acc.description}</span></SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {eventDetails.length < 20 && (
                                    <Button variant="outline" onClick={addEventRow} className="w-full h-12 border-2 border-dashed border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-brand-50 hover:border-brand-500 transition-all gap-2"><Plus className="w-3.5 h-3.5" /> Append Logical Identifier ({eventDetails.length}/20)</Button>
                                )}
                            </div>
                        </div>

                        {/* Credit Card Instrument */}
                        <div className="col-span-full space-y-4 pt-4 border-t border-gray-50">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Liability Attribution (Corporate Instrument)</Label>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingCard(!isAddingCard)} className="h-6 text-[9px] font-black uppercase tracking-widest text-brand-600">{isAddingCard ? "Decline" : "+ Register Instrument"}</Button>
                            </div>
                            {isAddingCard ? (
                                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4">
                                    <Input autoFocus className="h-11 rounded-xl font-bold" placeholder="Provider (AMEX)" value={newCardName} onChange={(e) => setNewCardName(e.target.value)} />
                                    <div className="flex gap-2">
                                        <Input className="h-11 rounded-xl font-mono italic" placeholder="Last 4 Digits..." value={newCardNo} onChange={(e) => setNewCardNo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddCard(); } }} />
                                        <Button onClick={handleQuickAddCard} variant="brand" className="h-11 px-4 rounded-xl font-black uppercase tracking-widest text-[9px]">Sync</Button>
                                    </div>
                                </div>
                            ) : (
                                <Select value={creditCardNo} onValueChange={setCreditCardNo}>
                                    <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 border-gray-50 font-bold text-sm"><SelectValue placeholder="Identify Financial Instrument..." /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {cardOptions.map(c => <SelectItem key={c.id} value={c.card_no} className="text-sm font-medium">{c.card_no} <span className="opacity-40">- {c.card_name}</span></SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 3: Expenditure Logistics */}
                <div className="space-y-6 pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg text-[10px]">03</div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Expenditure Logistics</h3>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Directive Objective</Label>
                            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="min-h-[100px] rounded-2xl bg-gray-50/50 border-gray-50 focus:bg-white transition-all font-bold text-sm leading-relaxed p-4 resize-none" placeholder="Primary purpose..." />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Cycle</Label>
                                <Select value={billingType} onValueChange={setBillingType}>
                                    <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-50 font-bold text-[10px] uppercase tracking-tighter"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="ONE_TIME" className="text-xs font-bold uppercase tracking-tighter">One-time Injection</SelectItem>
                                        <SelectItem value="MONTHLY" className="text-xs font-bold uppercase tracking-tighter">Monthly Cycle</SelectItem>
                                        <SelectItem value="YEARLY" className="text-xs font-bold uppercase tracking-tighter">Annual Cycle</SelectItem>
                                        <SelectItem value="YEARLY_MONTHLY" className="text-xs font-bold uppercase tracking-tighter">Hybrid (Ann/Mon)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Booking</Label>
                                <Input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="h-10 rounded-xl bg-gray-50/50 border-gray-50 font-bold text-[10px] p-2" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Commence</Label>
                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-xl bg-gray-50/50 border-gray-50 font-bold text-[10px] p-2" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Terminate</Label>
                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-10 rounded-xl bg-gray-50/50 border-gray-50 font-bold text-[10px] p-2" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Resource Attribution */}
                <div className="space-y-6 pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black shadow-lg text-[10px]">04</div>
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Resource Attribution</h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {PROMOTIONAL_CHANNELS.map((channel) => {
                            const isChecked = promotionalChannels.some((c: any) => c.channel === channel);
                            return (
                                <button key={channel} type="button" onClick={() => handleChannelToggle(channel)} className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 border-2", isChecked ? "bg-brand-50 border-brand-500 text-brand-700 shadow-sm" : "bg-white border-gray-50 text-gray-400 hover:border-brand-200")}>
                                    {channel}
                                </button>
                            );
                        })}
                        {showCustomInput ? (
                            <div className="flex items-center gap-2 animate-in zoom-in-95">
                                <Input autoFocus className="h-10 rounded-xl bg-white font-bold text-xs w-32" placeholder="Node..." value={customChannelName} onChange={(e) => setCustomChannelName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomChannel(); } }} />
                                <Button size="icon" variant="brand" onClick={handleAddCustomChannel} className="h-10 w-10 rounded-xl"><Plus className="w-4 h-4" /></Button>
                            </div>
                        ) : (
                            <Button variant="ghost" onClick={() => setShowCustomInput(true)} className="h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 border-dashed border-gray-100 hover:bg-gray-50"><Plus className="w-4 h-4 mr-1.5" /> Append Slot</Button>
                        )}
                    </div>

                    {promotionalChannels.length > 0 && (
                        <div className="space-y-4 pt-4 animate-in slide-in-from-bottom-5 duration-500">
                            {promotionalChannels.map((chan: any, idx: number) => (
                                <div key={chan.channel} className="p-6 rounded-2xl bg-gradient-to-br from-brand-50/30 to-indigo-50/10 border border-white shadow-sm relative">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Badge variant="brand" className="rounded-lg h-5 text-[8px] font-black uppercase tracking-widest">{chan.channel}</Badge>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30">Account Profile</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 ml-1">Media ID / Email</Label>
                                            <Input value={chan.mediaAccountEmail} onChange={(e) => updateChannelDetail(idx, "mediaAccountEmail", e.target.value)} className="h-10 rounded-xl bg-white border-white focus:border-brand-200 font-bold" placeholder="ads@organization.com" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 ml-1">Access Matrix</Label>
                                            <Input value={chan.accessList} onChange={(e) => updateChannelDetail(idx, "accessList", e.target.value)} className="h-10 rounded-xl bg-white border-white focus:border-brand-200 font-bold" placeholder="Users (Group)" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Implementation Footer */}
                <div className="flex gap-3 pt-8 mt-10 border-t border-gray-50 pb-5">
                    <Button variant="outline" onClick={onClose} className="h-14 flex-1 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] border-gray-100 hover:bg-gray-50/50 outline-none">Cancel Allocation</Button>
                    <Button onClick={handleSave} disabled={saving} variant="brand" className="h-14 flex-[2] rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-xl shadow-brand/20 transition-all hover:scale-[1.01] active:scale-[0.99] outline-none">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Commit Modifications"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// Custom CSS for refined scrollbar (can be added to globals.css later but adding key structure here for reference if it was needed in standard CSS)
