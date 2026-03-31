"use client";

import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequestRecord, Project, EventMaster, AccountCodeMaster, CreditCardMaster } from "@/lib/types";
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
    const [accountCode, setAccountCode] = useState("");
    const [creditCardNo, setCreditCardNo] = useState("");

    // Master Data Options
    const [eventOptions, setEventOptions] = useState<EventMaster[]>([]);
    const [accountOptions, setAccountOptions] = useState<AccountCodeMaster[]>([]);
    const [cardOptions, setCardOptions] = useState<CreditCardMaster[]>([]);

    // Inline Add States (to match CardRequestForm)
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
            setRequestId(request.req_id || "");
            setAccountCode(request.account_code || "");
            setCreditCardNo(request.credit_card_no || "");
            
            // Map event details
            if (Array.isArray(request.event_details) && request.event_details.length > 0) {
                setEventDetails(request.event_details.map((ed: any) => ({
                    eventId: ed.eventId || ed.reqId || "",
                    accountCode: ed.accountCode || ""
                })));
            } else {
                // Fallback to single Master ID from event_id column
                setEventDetails([{ eventId: (request as any).event_id || "", accountCode: request.account_code || "" }]);
            }
            
            // Map promotional channels
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
                // No need to setRequestId here, as this is for the Master Event ID
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
                setAccountCode(added.code);
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
        
        // Auto-match account code if eventId changes
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
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Request Detail" maxWidth="max-w-4xl">
            <div key="modal-content" className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 pb-4 scrollbar-thin scrollbar-thumb-gray-200">
                {error && (
                    <div className="p-4 bg-red-50/50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-2xl animate-shake">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* 1. Requester Information */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold shadow-sm">1</div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">Requester Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 flex-1">
                            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Request ID (Read-only)</label>
                            <input
                                value={requestId}
                                disabled
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm font-mono text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Full Name</label>
                            <input
                                value={fullName}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                                className="w-full bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                placeholder="Staff Name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Team / Department</label>
                            <input
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                placeholder="e.g. Creative Production"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Contact No.</label>
                            <input
                                value={contactNo}
                                onChange={(e) => setContactNo(e.target.value)}
                                className="w-full bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                placeholder="0XX-XXX-XXXX"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">E-Mail Address</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type="email"
                                className="w-full bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                                placeholder="email@company.com"
                            />
                        </div>
                    </div>
                </section>

                <section className="space-y-4 pt-4 border-t border-gray-100/50 dark:border-gray-800/30">
                    <div className="flex items-center gap-2 mb-1 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]"></div>
                        <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Project & Budget</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Project Autocomplete & Quick Add */}
                        <div className="col-span-full md:col-span-1" ref={projectRef}>
                            <label className="flex items-center justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">
                                Project Name
                                <button type="button" onClick={() => setIsAddingProject(!isAddingProject)} className="text-[10px] text-brand-600 font-bold hover:underline bg-brand-50 px-2 py-0.5 rounded ml-2">
                                    {isAddingProject ? "Cancel" : "+ New"}
                                </button>
                            </label>
                            {isAddingProject ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" 
                                        placeholder="Type new project name..." 
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddProject(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddProject} className="px-3 py-2 min-w-[70px] text-xs font-semibold rounded-xl bg-brand-500 text-white shadow hover:bg-brand-600">Save</button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input
                                        value={projectSearch}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setProjectSearch(e.target.value);
                                            setShowProjectDropdown(true);
                                        }}
                                        onFocus={() => setShowProjectDropdown(true)}
                                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                                        placeholder="Search project..."
                                    />
                                    {showProjectDropdown && projectOptions.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 glass-card border border-white/20 shadow-2xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                            {projectOptions.map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setProjectSearch(p.project_name);
                                                        setSelectedProjectId(p.id);
                                                        setShowProjectDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-sm hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors border-b border-gray-50 dark:border-gray-800/30 last:border-0"
                                                >
                                                    {p.project_name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Amount */}
                        <div className="md:col-span-1">
                            <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">Plan Budget (AED)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                                placeholder="0.00"
                            />
                        </div>

                        {/* Event & Account Details Section */}
                        <div className="col-span-full space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-1">Event & Account Details</h4>
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
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-500" 
                                        placeholder="New Event ID..." 
                                        value={newEventId}
                                        onChange={(e) => setNewEventId(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddEvent(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddEvent} className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Save</button>
                                </div>
                            )}

                            {isAddingAccount && (
                                <div className="flex gap-2 p-3 bg-brand-50/50 rounded-xl border border-brand-100 animate-slide-down">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="w-full bg-white dark:bg-gray-900 border border-gray-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-brand-500" 
                                        placeholder="New Account Code..." 
                                        value={newAccountCode}
                                        onChange={(e) => setNewAccountCode(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddAccount(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddAccount} className="bg-brand-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Save</button>
                                </div>
                            )}

                            <div className="space-y-3">
                                {eventDetails.map((ed, idx) => (
                                    <div key={idx} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10 relative group">
                                        {eventDetails.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => removeEventRow(idx)}
                                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight ml-1">Event (Master) ID #{idx + 1}</label>
                                                <select
                                                    value={ed.eventId}
                                                    onChange={(e) => updateEventDetail(idx, "eventId", e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                                >
                                                    <option value="">Select Event...</option>
                                                    {eventOptions.map((ev: EventMaster) => (
                                                        <option key={ev.id} value={ev.event_id}>{ev.event_id} - {ev.description || "No desc"}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight ml-1">Account Code #{idx + 1}</label>
                                                <select
                                                    value={ed.accountCode}
                                                    onChange={(e) => updateEventDetail(idx, "accountCode", e.target.value)}
                                                    className="w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all"
                                                >
                                                    <option value="">Select Account...</option>
                                                    {accountOptions.map((acc: any) => (
                                                        <option key={acc.id} value={acc.code}>{acc.code} - {acc.description}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {eventDetails.length < 20 && (
                                    <button 
                                        type="button" 
                                        onClick={addEventRow}
                                        className="w-full py-2.5 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-[10px] font-bold text-gray-400 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                        Add Another Event / Account Pair ({eventDetails.length}/20)
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Credit Card No */}
                        <div className="col-span-full md:col-span-2">
                            <label className="flex items-center justify-between text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">
                                Credit Card No
                                <button type="button" onClick={() => setIsAddingCard(!isAddingCard)} className="text-[10px] text-brand-600 font-bold hover:underline bg-brand-50 px-2 py-0.5 rounded ml-2">
                                    {isAddingCard ? "Cancel" : "+ New"}
                                </button>
                            </label>
                            {isAddingCard ? (
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" 
                                        placeholder="Name (e.g. AMEX)" 
                                        value={newCardName}
                                        onChange={(e) => setNewCardName(e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" 
                                        placeholder="Card No (e.g. 1234)" 
                                        value={newCardNo}
                                        onChange={(e) => setNewCardNo(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAddCard(); } }}
                                    />
                                    <button type="button" onClick={handleQuickAddCard} className="px-3 py-2 min-w-[70px] text-xs font-semibold rounded-xl bg-brand-500 text-white shadow hover:bg-brand-600">Save</button>
                                </div>
                            ) : (
                                <select
                                    value={creditCardNo}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCreditCardNo(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                                >
                                    <option value="">Select Corporate Card...</option>
                                    {cardOptions.map((card: any) => (
                                        <option key={card.id} value={card.card_no}>{card.card_name} ({card.card_no.slice(-4)})</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Objective */}
                        <div className="col-span-full">
                            <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">Objective</label>
                            <textarea
                                value={objective}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setObjective(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none resize-none"
                                rows={2}
                                placeholder="Describe the campaign or purpose..."
                            />
                        </div>

                        {/* Periodicity & Dates */}
                        <div className="col-span-full grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">Billing Periodicity</label>
                                <select
                                    value={billingType}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBillingType(e.target.value)}
                                    className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none cursor-pointer"
                                >
                                    <option value="ONE_TIME">One-time</option>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="YEARLY">Yearly</option>
                                    <option value="YEARLY_MONTHLY">Yearly/Monthly</option>
                                </select>
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">Booking Date</label>
                                <input type="date" value={bookingDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBookingDate(e.target.value)} className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">Start Date</label>
                                <input type="date" value={startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)} className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-[10px] font-semibold text-gray-400 dark:text-gray-500 mb-1.5 px-1 uppercase tracking-wider">End Date</label>
                                <input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Promotional Channels */}
                <section className="pt-4 border-t border-gray-100/50 dark:border-gray-800/30">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xs font-bold shadow-sm">3</div>
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">Campaign Channels</h3>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg">
                            {promotionalChannels.length} Selected
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {PROMOTIONAL_CHANNELS.map((channel) => {
                            const isChecked = promotionalChannels.some((c: any) => c.channel === channel);
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

                        {promotionalChannels
                            .filter((c: any) => !PROMOTIONAL_CHANNELS.includes(c.channel))
                            .map((c: any) => {
                                const channel = c.channel;
                                return (
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
                                );
                        })}

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

                    {/* Detailed Channel Inputs */}
                    <div className="space-y-3 mt-4">
                        {promotionalChannels.map((chan: any, idx: number) => (
                            <div key={chan.channel} className="bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800/30 rounded-2xl p-4 animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100/50 dark:border-gray-800/30">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                                        <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tight">{chan.channel}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleChannelToggle(chan.channel)}
                                        className="text-gray-300 hover:text-red-400 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Media Account / Email</label>
                                        <input
                                            value={chan.mediaAccountEmail}
                                            onChange={(e) => updateChannelDetail(idx, "mediaAccountEmail", e.target.value)}
                                            className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                                            placeholder="Account ID or Email"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Access List / UID</label>
                                        <input
                                            value={chan.accessList}
                                            onChange={(e) => updateChannelDetail(idx, "accessList", e.target.value)}
                                            className="w-full bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all outline-none"
                                            placeholder="UIDs or Staff Names"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}

                        {promotionalChannels.length === 0 && (
                            <div className="py-8 text-center bg-gray-50/30 dark:bg-gray-900/10 border-2 border-dashed border-gray-100 dark:border-gray-800/50 rounded-2xl">
                                <svg className="w-10 h-10 text-gray-200 dark:text-gray-800 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                </svg>
                                <p className="text-xs text-gray-400 font-medium tracking-tight">No campaign channels selected yet</p>
                            </div>
                        )}
                    </div>
                </section>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100/50 dark:border-gray-800/30 mt-4">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                    >
                        Discard Changes
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/20 rounded-xl flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
                    >
                        {saving ? (
                            <>
                                <svg className="animate-spin w-3.5 h-3.5" stroke="currentColor" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving Changes...
                            </>
                        ) : (
                            <>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                                Save Updates
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

