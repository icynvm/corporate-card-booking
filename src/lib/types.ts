// Type definitions for the application

export interface Profile {
    id: string;
    name: string;
    email: string;
    department: string;
    contact_no: string;
    role: "USER" | "MANAGER" | "FA";
    created_at: string;
}

export interface Project {
    id: string;
    project_name: string;
    total_budget: number;
    remaining_budget: number;
    created_by: string | null;
    created_at: string;
}

export interface RequestRecord {
    id: string;
    event_id: string;
    user_id: string;
    project_id: string | null;
    project_name: string;
    amount: number;
    objective: string;
    contact_no: string;
    email: string;
    billing_type: "ONE_TIME" | "MONTHLY" | "YEARLY" | "YEARLY_MONTHLY";
    start_date: string;
    end_date: string;
    booking_date: string | null;
    effective_date: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
    promotional_channels: ChannelDetail[] | null;
    pdf_url: string | null;
    approval_file_url: string | null;
    approval_notes: string;
    approval_token: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    profiles?: Profile;
    projects?: Project;
    receipts?: ReceiptRecord[];
    request_payments?: RequestPayment[];
}

export interface ChannelDetail {
    channel: string;
    mediaAccountEmail: string;
    accessList: string;
}

export interface ReceiptRecord {
    id: string;
    request_id: string;
    month_year: string;
    receipt_file_url: string;
    status: "UPLOADED" | "VERIFIED";
    created_at: string;
}

export interface RequestPayment {
    id: string;
    request_id: string;
    month_year: string;
    amount_due: number;
    amount_paid: number;
    status: "PENDING" | "PAID" | "OVERDUE";
    payment_date: string | null;
    created_at: string;
}

export interface AuditLog {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    user_id: string | null;
    user_name: string;
    changes: Record<string, unknown>;
    created_at: string;
}

export interface HostingAllocation {
    id: string;
    hosting_name: string;
    provider: string;
    max_sites: number;
    created_at: string;
    sites?: HostingSite[];
}

export interface HostingSite {
    id: string;
    hosting_id: string;
    request_id: string | null;
    domain_name: string;
    is_subdomain: boolean;
    created_at: string;
}
