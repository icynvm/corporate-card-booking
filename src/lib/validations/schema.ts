import { z } from "zod";

export const PROMOTIONAL_CHANNELS = [
    "Facebook",
    "Youtube",
    "Google",
    "Instagram",
    "Line",
    "WeChat",
    "Tiktok",
    "Other",
] as const;

export type PromotionalChannel = (typeof PROMOTIONAL_CHANNELS)[number];

const channelDetailSchema = z.object({
    channel: z.string(),
    mediaAccountEmail: z.string().min(1, "Media account email/ID is required"),
    accessList: z.string().min(1, "Access list is required"),
});

export const requestFormSchema = z.object({
    fullName: z.string().min(2, "Full name must be at least 2 characters"),
    department: z.string().min(1, "Department is required"),
    contactNo: z.string().min(1, "Contact number is required"),
    objective: z.string().min(5, "Objective must be at least 5 characters"),
    projectId: z.string().min(1, "Please select a project"),
    bookingDate: z.string().min(1, "Booking date is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    billingType: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"], {
        required_error: "Please select a billing type",
    }),
    promotionalChannels: z.array(channelDetailSchema).optional(),
});

export type RequestFormData = z.infer<typeof requestFormSchema>;
