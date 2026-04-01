import { z } from "zod";
import { RequestStatus, BillingType } from "@/types/enums";

/**
 * Shared entity schemas
 */
export const ChannelDetailSchema = z.object({
  channel: z.string().min(1, "Channel name is required"),
  mediaAccountEmail: z.string().email("Invalid email address"),
  accessList: z.string().min(1, "Access list is required"),
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
  fullName: z.string().min(2, "Full name is required").optional(),
  projectName: z.string().min(2, "Project name is required"),
  objective: z.string().min(5, "Objective is required"),
  contactNo: z.string().min(9, "Contact number is required"),
  email: z.string().email("Invalid email").optional(),
  department: z.string().min(2, "Department is required").optional(),
  amount: z.union([z.number(), z.string().transform((v: string) => parseFloat(v))]),
  billingType: z.nativeEnum(BillingType),
  startDate: z.string(),
  endDate: z.string(),
  bookingDate: z.string().nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  promotionalChannels: z.array(ChannelDetailSchema).optional(),
  eventDetails: z.array(EventDetailSchema).optional(),
  projectId: z.string().uuid().optional(),
  reqId: z.string().optional(),
  creditCardNo: z.string().optional(),
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
