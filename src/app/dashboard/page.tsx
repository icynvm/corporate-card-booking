"use client";

import { useState, useEffect, useMemo } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { RequestsTable } from "@/components/dashboard/RequestsTable";
import { ReceiptUploadModal } from "@/components/dashboard/ReceiptUploadModal";
import { RequestRecord } from "@/lib/types";

// Demo data for when database is not connected
const DEMO_DATA: RequestRecord[] = [
    {
        id: "1",
        eventId: "REQ-2026-0001",
        userId: "u1",
        projectId: "proj-001",
        amount: 45000,
        objective: "Facebook Ads for Q1 Campaign",
        contactNo: "081-234-5678",
        billingType: "MONTHLY",
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        status: "APPROVED",
        promotionalChannels: [
            { channel: "Facebook", mediaAccountEmail: "ads@company.com", accessList: "Sarah, John" },
        ],
        pdfUrl: null,
        createdAt: "2026-01-15T10:00:00Z",
        updatedAt: "2026-01-16T10:00:00Z",
        user: { id: "u1", name: "Alex Williams", email: "alex@company.com", department: "Digital Marketing", role: "USER" },
        project: { id: "proj-001", projectName: "Q1 Digital Campaign 2026", totalBudget: 500000, remainingBudget: 455000 },
        receipts: [
            { id: "r1", requestId: "1", monthYear: "2026-01", receiptFileUrl: "/rec1.pdf", status: "VERIFIED", createdAt: "2026-02-01" },
            { id: "r2", requestId: "1", monthYear: "2026-02", receiptFileUrl: "/rec2.pdf", status: "UPLOADED", createdAt: "2026-03-01" },
        ],
    },
    {
        id: "2",
        eventId: "REQ-2026-0002",
        userId: "u1",
        projectId: "proj-002",
        amount: 120000,
        objective: "Google Ads for Brand Awareness",
        contactNo: "081-234-5678",
        billingType: "ONE_TIME",
        startDate: "2026-02-01",
        endDate: "2026-02-28",
        status: "PENDING",
        promotionalChannels: [
            { channel: "Google", mediaAccountEmail: "google-ads@company.com", accessList: "Marketing Team" },
        ],
        pdfUrl: null,
        createdAt: "2026-02-10T10:00:00Z",
        updatedAt: "2026-02-10T10:00:00Z",
        user: { id: "u1", name: "Alex Williams", email: "alex@company.com", department: "Digital Marketing", role: "USER" },
        project: { id: "proj-002", projectName: "Brand Awareness Initiative", totalBudget: 250000, remainingBudget: 130000 },
        receipts: [],
    },
    {
        id: "3",
        eventId: "REQ-2026-0003",
        userId: "u2",
        projectId: "proj-003",
        amount: 85000,
        objective: "TikTok & Instagram Campaign for Product Launch",
        contactNo: "089-876-5432",
        billingType: "MONTHLY",
        startDate: "2026-03-01",
        endDate: "2026-06-30",
        status: "APPROVED",
        promotionalChannels: [
            { channel: "Tiktok", mediaAccountEmail: "tiktok@company.com", accessList: "Sarah, Emily" },
            { channel: "Instagram", mediaAccountEmail: "ig@company.com", accessList: "Sarah" },
        ],
        pdfUrl: null,
        createdAt: "2026-02-28T10:00:00Z",
        updatedAt: "2026-03-01T10:00:00Z",
        user: { id: "u2", name: "Emily Chen", email: "emily@company.com", department: "Content Marketing", role: "USER" },
        project: { id: "proj-003", projectName: "Product Launch Campaign", totalBudget: 750000, remainingBudget: 665000 },
        receipts: [],
    },
    {
        id: "4",
        eventId: "REQ-2026-0004",
        userId: "u1",
        projectId: "proj-001",
        amount: 35000,
        objective: "YouTube Video Promotion",
        contactNo: "081-234-5678",
        billingType: "ONE_TIME",
        startDate: "2026-02-15",
        endDate: "2026-02-28",
        status: "REJECTED",
        promotionalChannels: [
            { channel: "Youtube", mediaAccountEmail: "yt@company.com", accessList: "John" },
        ],
        pdfUrl: null,
        createdAt: "2026-02-12T10:00:00Z",
        updatedAt: "2026-02-13T10:00:00Z",
        user: { id: "u1", name: "Alex Williams", email: "alex@company.com", department: "Digital Marketing", role: "USER" },
        project: { id: "proj-001", projectName: "Q1 Digital Campaign 2026", totalBudget: 500000, remainingBudget: 455000 },
        receipts: [],
    },
    {
        id: "5",
        eventId: "REQ-2026-0005",
        userId: "u3",
        projectId: "proj-002",
        amount: 62000,
        objective: "LINE OA Campaign Ads",
        contactNo: "082-111-2222",
        billingType: "YEARLY",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        status: "COMPLETED",
        promotionalChannels: [
            { channel: "Line", mediaAccountEmail: "line-oa@company.com", accessList: "Marketing Team" },
        ],
        pdfUrl: null,
        createdAt: "2026-01-05T10:00:00Z",
        updatedAt: "2026-01-10T10:00:00Z",
        user: { id: "u3", name: "David Kim", email: "david@company.com", department: "Communications", role: "USER" },
        project: { id: "proj-002", projectName: "Brand Awareness Initiative", totalBudget: 250000, remainingBudget: 130000 },
        receipts: [],
    },
];

export default function DashboardPage() {
    const [requests, setRequests] = useState<RequestRecord[]>(DEMO_DATA);
    const [filterStatus, setFilterStatus] = useState("");
    const [filterBilling, setFilterBilling] = useState("");
    const [filterProject, setFilterProject] = useState("");
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);

    // Try to fetch from API on mount; fall back to demo data
    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const res = await fetch("/api/requests");
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        setRequests(data);
                    }
                }
            } catch {
                // Use demo data
            }
        };
        fetchRequests();
    }, []);

    // Filtered data
    const filteredData = useMemo(() => {
        return requests.filter((r) => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterBilling && r.billingType !== filterBilling) return false;
            if (filterProject && r.projectId !== filterProject) return false;
            return true;
        });
    }, [requests, filterStatus, filterBilling, filterProject]);

    // KPI calculations
    const kpis = useMemo(() => {
        const totalSpent = requests
            .filter((r) => r.status === "APPROVED" || r.status === "COMPLETED")
            .reduce((sum, r) => sum + r.amount, 0);
        const pendingCount = requests.filter((r) => r.status === "PENDING").length;
        const monthlyCommitments = requests
            .filter((r) => r.billingType === "MONTHLY" && (r.status === "APPROVED" || r.status === "COMPLETED"))
            .reduce((sum, r) => sum + r.amount, 0);
        const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

        return { totalSpent, pendingCount, monthlyCommitments, approvedCount };
    }, [requests]);

    // Unique projects for filter
    const projects = useMemo(() => {
        const map = new Map<string, string>();
        requests.forEach((r) => {
            if (r.project) map.set(r.projectId, r.project.projectName);
        });
        return Array.from(map.entries());
    }, [requests]);

    const handleUploadReceipt = (request: RequestRecord) => {
        setSelectedRequest(request);
        setReceiptModalOpen(true);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                    Tracking <span className="gradient-text">Dashboard</span>
                </h1>
                <p className="text-sm text-gray-500">
                    Monitor requests, approvals, and monthly expenses.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <KPICard
                    title="Total Spent"
                    value={`฿${kpis.totalSpent.toLocaleString()}`}
                    subtitle="Approved & Completed"
                    gradient="bg-gradient-to-br from-brand-500 to-purple-600"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                    }
                />
                <KPICard
                    title="Pending Approvals"
                    value={kpis.pendingCount}
                    subtitle="Awaiting review"
                    gradient="bg-gradient-to-br from-amber-400 to-orange-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                    }
                />
                <KPICard
                    title="Monthly Commitments"
                    value={`฿${kpis.monthlyCommitments.toLocaleString()}`}
                    subtitle="Active recurring"
                    gradient="bg-gradient-to-br from-emerald-500 to-teal-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                            <polyline points="17 6 23 6 23 12" />
                        </svg>
                    }
                />
                <KPICard
                    title="Approved Requests"
                    value={kpis.approvedCount}
                    subtitle="Currently active"
                    gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    }
                />
            </div>

            {/* Filters */}
            <div className="glass-card p-5">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                        </svg>
                        <span className="text-sm font-medium text-gray-500">Filters:</span>
                    </div>

                    <select
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="select-field w-auto min-w-[180px]"
                    >
                        <option value="">All Projects</option>
                        {projects.map(([id, name]) => (
                            <option key={id} value={id}>{name}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="select-field w-auto min-w-[150px]"
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="COMPLETED">Completed</option>
                    </select>

                    <select
                        value={filterBilling}
                        onChange={(e) => setFilterBilling(e.target.value)}
                        className="select-field w-auto min-w-[150px]"
                    >
                        <option value="">All Billing Types</option>
                        <option value="ONE_TIME">One-time</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                    </select>

                    {(filterStatus || filterBilling || filterProject) && (
                        <button
                            onClick={() => {
                                setFilterStatus("");
                                setFilterBilling("");
                                setFilterProject("");
                            }}
                            className="text-xs text-brand-500 hover:text-brand-700 font-medium transition-colors"
                        >
                            Clear All ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Requests Table */}
            <RequestsTable data={filteredData} onUploadReceipt={handleUploadReceipt} />

            {/* Receipt Upload Modal */}
            <ReceiptUploadModal
                isOpen={receiptModalOpen}
                onClose={() => {
                    setReceiptModalOpen(false);
                    setSelectedRequest(null);
                }}
                request={selectedRequest}
            />
        </div>
    );
}
