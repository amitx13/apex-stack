import { z } from "zod"
export interface BaseUser {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
}

export interface User extends BaseUser {
  role: 'USER';
  code: string
  gasConsumerNumber: string;
  isRegistrationPayment: boolean;
  isGasConsumerVerified: boolean;
  membersCount: number;
  isBankAdded: boolean
}

export interface Vendor extends BaseUser {
  role: 'VENDOR';
  commissionRate: number; // Commission percentage (e.g., 2.5 for 2.5%)
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  shopName: string,
  category: string,
  isBankAdded: boolean
}

export type AppUser = User | Vendor;
export interface Operator {
  code: string;
  name: string;
  icons: string
  service: string;
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

export const SignUpVendor = z.object({
  // Personal Details
  name: z
    .string()
    .min(1, "Owner name is required")
    .min(2, "Owner name must be at least 2 characters")
    .max(50, "Owner name must be less than 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Owner name can only contain letters and spaces"),

  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian phone number"),

  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .max(32, "Password must be less than 32 characters"),

  // Shop Details
  shopName: z
    .string()
    .min(1, "Shop name is required")
    .min(2, "Shop name must be at least 2 characters")
    .max(100, "Shop name must be less than 100 characters"),

  category: z
    .string()
    .min(1, "Business category is required")
    .min(2, "Category must be at least 2 characters")
    .max(50, "Category must be less than 50 characters"),

  pincode: z
    .string()
    .min(1, "Pincode is required")
    .length(6, "Pincode must be exactly 6 digits")
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid Indian pincode"),

  // KYC Documents
  panNumber: z
    .string()
    .min(1, "PAN number is required")
    .length(10, "PAN number must be exactly 10 characters")
    .regex(
      /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      "Enter a valid PAN number (e.g., ABCDE1234F)"
    )
    .transform(val => val.toUpperCase()),

  aadharNumber: z
    .string()
    .min(1, "Aadhar number is required")
    .length(12, "Aadhar number must be exactly 12 digits")
    .regex(/^[2-9]{1}[0-9]{11}$/, "Enter a valid 12-digit Aadhar number"),

  gstNumber: z
    .string()
    .optional(),

  referralCode: z
    .string()
    .min(1, "Referral code is required")
    .length(6, "Referral code must be exactly 6 characters")
    .regex(/^[A-Z0-9]{6}$/, "Referral code must contain only uppercase letters and numbers")
    .transform(val => val.toUpperCase()),
});

export type SignUpVendorInput = z.infer<typeof SignUpVendor>;