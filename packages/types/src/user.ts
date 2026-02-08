import { z } from "zod"

enum Role {
  "USER",
  "VENDOR"
}
export interface User {
  id: string;
  name: string;
  isActive: boolean
  phone: string;
  role: Role;
  gasConsumerNumber: string;
  membersCount: number;
  spendBalance: string | null;
  withdrawalBalance: string | null
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export const SignUpUser = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number"),

  gasConsumerNumber: z
    .string()
    .min(1, "Gas consumer number is required")
    .min(5, "Gas consumer number is too short")
    .max(20, "Gas consumer number is too long"),

  referralCode: z
    .string()
    .length(6, "Referral code must be exactly 6 characters"),

  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must be less than 32 characters"),
});

export type SignUpUserInput = z.infer<typeof SignUpUser>;