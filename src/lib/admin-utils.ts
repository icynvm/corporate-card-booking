/**
 * Admin Utility Functions
 * 
 * This file contains helper functions used exclusively by the Admin Dashboard.
 * Moving these out of the main page component makes the UI code much easier to read!
 */

import { STATUS_COLORS } from "./types";

/** 
 * Format a Date string into a readable format (e.g. "01 Jan 2024")
 */
export const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "โ€”";

const STATUS_LABEL_MAP: Record<string, string> = {
    DRAFT: "Draft",
    PENDING_APPROVAL: "Pending Approval",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    ACTIVE: "Active",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

/** 
 * Translates raw audit-log changes into a human-readable sentence.
 * For example, if the status changed from DRAFT to PENDING_APPROVAL,
 * this function will return "Changed status: Draft โ’ Pending Approval".
 */
export const describeAuditChange = (action: string, changes: Record<string, unknown> | null): string => {
    if (!changes || typeof changes !== "object") {
        const labels: Record<string, string> = {
            CREATE: "Created this request",
            APPROVE: "Approved this request",
            REJECT: "Rejected this request",
            CANCEL: "Cancelled this request",
            UPLOAD: "Uploaded a receipt",
            UPLOAD_APPROVAL: "Uploaded signed approval document",
            SEND_APPROVAL: "Sent approval email to manager",
            VERIFY: "Verified receipt",
            STATUS_CHANGE: "Changed request status",
            DELETE: "Deleted this request",
        };
        return labels[action] || action;
    }

    switch (action) {
        case "STATUS_CHANGE": {
            const from = STATUS_LABEL_MAP[changes.old_status as string] || (changes.old_status as string);
            const to = STATUS_LABEL_MAP[changes.new_status as string] || (changes.new_status as string);
            let msg = `Changed status: ${from} โ’ ${to}`;
            if (changes.notes) msg += ` โ€” "${changes.notes}"`;
            return msg;
        }
        case "APPROVE": {
            const from = STATUS_LABEL_MAP[changes.old_status as string] || "";
            let msg = "Approved this request";
            if (from) msg += ` (was ${from})`;
            if (changes.notes) msg += ` โ€” "${changes.notes}"`;
            return msg;
        }
        case "REJECT": {
            let msg = "Rejected this request";
            if (changes.notes) msg += ` โ€” "${changes.notes}"`;
            return msg;
        }
        case "CANCEL": {
            let msg = "Cancelled this request";
            if (changes.notes) msg += ` โ€” "${changes.notes}"`;
            return msg;
        }
        case "CREATE":
            return `Created request${changes.event_id ? ` ${changes.event_id}` : ""}`;
        case "UPLOAD":
            return `Uploaded receipt${changes.month_year ? ` for ${changes.month_year}` : ""}`;
        case "UPLOAD_APPROVAL":
            return `Uploaded signed approval document${changes.file_name ? `: ${changes.file_name}` : ""}`;
        case "SEND_APPROVAL":
            return `Sent approval email${changes.to ? ` to ${changes.to}` : ""}`;
        case "VERIFY":
            return `Verified receipt${changes.month_year ? ` for ${changes.month_year}` : ""}`;
        default:
            return Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(", ");
    }
};

/**
 * Returns TailwindCSS color classes for the Request status pill.
 */
export const getStatusColor = (status: string) =>
    (STATUS_COLORS as Record<string, string>)[status] || "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300";

/**
 * Returns TailwindCSS color classes for Audit Log icons based on the action type.
 */
export const getActionColor = (action: string) => {
    switch (action) {
        case "CREATE": return "bg-emerald-100 text-emerald-700";
        case "APPROVE": return "bg-blue-100 text-blue-700";
        case "REJECT": return "bg-red-100 text-red-700";
        case "CANCEL": return "bg-orange-100 text-orange-700";
        case "UPLOAD_APPROVAL": return "bg-purple-100 text-purple-700";
        case "UPLOAD": return "bg-amber-100 text-amber-700";
        case "SEND_APPROVAL": return "bg-indigo-100 text-indigo-700";
        case "STATUS_CHANGE": return "bg-cyan-100 text-cyan-700";
        case "VERIFY": return "bg-teal-100 text-teal-700";
        default: return "bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300";
    }
};

/**
 * Returns a small character icon for the Audit Log timeline.
 */
export const getActionIcon = (action: string) => {
    switch (action) {
        case "CREATE": return "🆕";
        case "APPROVE": return "✅";
        case "REJECT": return "❌";
        case "CANCEL": return "🚫";
        case "UPLOAD_APPROVAL": return "📄";
        case "UPLOAD": return "📄";
        case "SEND_APPROVAL": return "📧";
        case "STATUS_CHANGE": return "🔄";
        case "VERIFY": return "✅";
        default: return "❓";
    }
};

/**
 * Utility to download files directly from the browser.
 */
export const downloadFile = async (url: string) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const urlBlob = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = urlBlob;
        const filename = url.split("/").pop()?.split("?")[0] || "document.pdf";
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
        console.error("Download failed:", error);
    }
};

