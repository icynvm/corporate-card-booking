import { z } from "zod";
import { RequestStatus, BillingType } from "@/types/enums";

/**
 * Shared entity schemas
 */
export const ChannelDetailSchema = z.object({
  channel: z.string().min(1, "Channel name is required"),
  mediaAccountEmail: z.string().optional().or(z.literal("")),
  accessList: z.string().optional().or(z.literal("")),
});

export const EventDetailSchema = z.object({
  eventId: z.string().optional(),
  accountCode: z.string().min(1, "Account code is required"),
  reqId: z.string().optional(),
});

/**
 * API Request Body Schemas
 */
export const CreateRequestSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  projectName: z.string().min(1, "Project name is required"),
  objective: z.string().min(1, "Objective is required"),
  contactNo: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email"),
  department: z.string().min(1, "Department is required"),
  amount: z.union([z.number(), z.string().transform((v: string) => parseFloat(v))]),
  billingType: z.nativeEnum(BillingType),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  bookingDate: z.string().min(1, "Booking date is required"),
  effectiveDate: z.string().min(1, "Effective date is required"),
  promotionalChannels: z.array(ChannelDetailSchema).min(1, "At least one channel is required"),
  eventDetails: z.array(EventDetailSchema).min(1, "At least one event detail is required"),
  projectId: z.string().uuid().optional().nullable().or(z.literal("").transform(() => null)),
  reqId: z.string().optional(),
  creditCardNo: z.string().min(1, "Credit card number is required"),
  fbCampaignId: z.string().optional(),
  fbAdAccountId: z.string().optional(),
});

export const UpdateStatusSchema = z.object({
  status: z.nativeEnum(RequestStatus),
  approvalNotes: z.string().optional(),
});

/**
 * Filter Schemas
 */
export const RequestQuerySchema = z.object({
  status: z.nativeEnum(RequestStatus).optional(),
  billingType: z.nativeEnum(BillingType).optional(),
});
