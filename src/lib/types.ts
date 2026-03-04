// Type definitions for the application

export interface Project {
    id: string;
    projectName: string;
    totalBudget: number;
    remainingBudget: number;
}

export interface RequestRecord {
    id: string;
    eventId: string;
    userId: string;
    projectId: string;
    amount: number;
    objective: string;
    contactNo: string;
    billingType: "ONE_TIME" | "MONTHLY" | "YEARLY";
    startDate: string;
    endDate: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
    promotionalChannels: ChannelDetail[] | null;
    pdfUrl: string | null;
    createdAt: string;
    updatedAt: string;
    user?: {
        id: string;
        name: string;
        email: string;
        department: string;
        role: string;
    };
    project?: Project;
    receipts?: ReceiptRecord[];
}

export interface ChannelDetail {
    channel: string;
    mediaAccountEmail: string;
    accessList: string;
}

export interface ReceiptRecord {
    id: string;
    requestId: string;
    monthYear: string;
    receiptFileUrl: string;
    status: "UPLOADED" | "VERIFIED";
    createdAt: string;
}
