import { z } from "zod";

export const PROMOTIONAL_CHANNELS = [
    "Facebook",
    "Youtube",
    "Google",
    "IG",
    "Line",
    "Other",
    "Tiktok",
    "WeChat",
];

export const requestFormSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    department: z.string().min(1, "Department is required"),
    contactNo: z.string().min(1, "Contact number is required"),
    email: z.string().email("Valid email is required"),
    projectId: z.string().optional(),
    objective: z.string().min(1, "Objective is required"),
    bookingDate: z.string().min(1, "Booking date is required"),
    effectiveDate: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    billingType: z.enum(["ONE_TIME", "MONTHLY", "YEARLY", "YEARLY_MONTHLY"]),
    accountCode: z.string().optional(),
    creditCardNo: z.string().optional(),
    promotionalChannels: z.array(
        z.object({
            channel: z.string(),
            mediaAccountEmail: z.string(),
            accessList: z.string(),
        })
    ).optional(),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;
