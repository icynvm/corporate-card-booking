import { parseISO, eachMonthOfInterval, format, isAfter, addDays, startOfMonth, endOfMonth } from "date-fns";
import { RequestRecord } from "@/lib/types";

/**
 * Calculates the months within a request's date range.
 */
export const getMonthsInRange = (startDateStr: string | null | undefined, endDateStr: string | null | undefined) => {
    if (!startDateStr || !endDateStr) return [];
    try {
        const start = parseISO(startDateStr);
        const end = parseISO(endDateStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
        return eachMonthOfInterval({ start, end });
    } catch {
        return [];
    }
};

/**
 * Checks if a request has any overdue receipt uploads.
 * Grace period is 7 days after the month ends.
 */
export const getOverdueMonths = (request: RequestRecord) => {
    // Only approved/active/completed requests need receipts
    if (!["APPROVED", "ACTIVE", "COMPLETED"].includes(request.status)) return [];

    const today = new Date();
    const gracePeriodDays = 7;
    const overdue: string[] = [];

    const isYearlyMonthly = request.billing_type === "YEARLY_MONTHLY";
    const monthsInRange = getMonthsInRange(request.start_date, request.end_date);
    const isMonthlyLongTerm = request.billing_type === "MONTHLY" && monthsInRange.length > 2;

    if (isYearlyMonthly || isMonthlyLongTerm) {
        // Multi-month logic
        for (const mDate of monthsInRange) {
            const mKey = format(mDate, "yyyy-MM");
            const hasReceipt = request.receipts?.some(r => r.month_year === mKey);
            if (hasReceipt) continue;

            // Deadline is 7th of next month
            const deadline = addDays(endOfMonth(mDate), gracePeriodDays);
            
            // If today is past the deadline, it's overdue
            if (isAfter(today, deadline)) {
                overdue.push(format(mDate, "MMMM yyyy"));
            }
        }
    } else {
        // One-time or simple monthly logic
        const hasReceipt = request.receipts && request.receipts.length > 0;
        if (!hasReceipt && request.end_date) {
            const endDate = parseISO(request.end_date);
            if (!isNaN(endDate.getTime())) {
                const deadline = addDays(endDate, gracePeriodDays);
                if (isAfter(today, deadline)) {
                    overdue.push("Final Receipt");
                }
            }
        }
    }

    return overdue;
};
