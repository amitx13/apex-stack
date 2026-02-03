// apps/server/src/config/mlm.constants.ts

export const MLM_CONFIG = {
  // Matrix structure
  MATRIX_WIDTH: 5, // 5x5 matrix (5 children per node)
  MAX_UPLINE_LEVELS: 15, // Commission goes to 15 levels up

  // Payment breakdown
  REGISTRATION_AMOUNT: 199, // ₹199
  REGISTRATION_POINTS: 199, // 199 points
  
  // Deductions (not shown in system)
  GST: 30, // ₹30
  COMPANY_PROFIT: 8, // ₹8
  GATEWAY_CHARGE: 6, // ₹6
  TOTAL_DEDUCTIONS: 44, // 30 + 8 + 6 = 44
  
  // Distributable points
  UPLINE_DISTRIBUTION: 155, // 199 - 44 = 155 points

  // Re-entry
  REENTRY_THRESHOLD: 163, // Points needed in INCENTIVE wallet
  REENTRY_POINTS: 163, // Points deducted on re-entry
  REENTRY_DEDUCTION: 8, // Company cut on re-entry (163 - 155)

  // Wallet distribution ratios
  WALLET_SPLIT: {
    SPEND: 0.60, // 60%
    INCENTIVE: 0.30, // 30%
    WITHDRAWAL: 0.10, // 10%
  },

  // Commission structure (15 levels)
  COMMISSION_STRUCTURE: {
    1: 19,
    2: 18,
    3: 17,
    4: 18,
    5: 16,
    6: 14,
    7: 12,
    8: 12,
    9: 12,
    10: 12,
    11: 1,
    12: 1,
    13: 1,
    14: 1,
    15: 1,
  } as  Record<number, number>,
} as const;

// Validate commission structure totals 155
const totalCommission = Object.values(MLM_CONFIG.COMMISSION_STRUCTURE).reduce(
  (sum, val) => sum + val,
  0
);

if (totalCommission !== MLM_CONFIG.UPLINE_DISTRIBUTION) {
  throw new Error(
    `Commission structure total (${totalCommission}) does not match UPLINE_DISTRIBUTION (${MLM_CONFIG.UPLINE_DISTRIBUTION})`
  );
}
