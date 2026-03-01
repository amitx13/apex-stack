import z from "zod";

export const LoginSchema = z.object({
    userId: z.string(),
    password: z.string().min(1, 'Password is required'),
});

export interface DashboardData {
    members: {
        total: number;
        active: number;
        inactive: number;
        totalMatrixPositions: number;
    };
    today: {
        totalSpend: number;
        serviceCommission: number;
        vendorEarnings: number;
        userWithdrawalsPaid: number;
        vendorWithdrawalsPaid: number;
        totalWithdrawalsPaid: number;
    };
    commission: {
        todayServiceCommission: number;
        totalServiceCommission: number;
    };
    withdrawals: {
        todayCompleted: number;
        todayUserCompleted: number;
        todayVendorCompleted: number;
        totalCompleted: number;
        totalUserCompleted: number;
        totalVendorCompleted: number;
        pendingUserCount: number;
        pendingUserAmount: number;
        pendingVendorCount: number;
        pendingVendorAmount: number;
    };
    netIncome: {
        todayAdminWalletCredits: number;
        todayServiceCommission: number;
        todayWithdrawalsPaid: number;
        todayNet: number;
        adminWalletBalance: number;
    };
    pendingActions: {
        withdrawalRequests: number;
        vendorApprovals: number;
        billRequests: number;
        reentryQueue: number;
        autoPayApprovals: number;
        vendorWithdrawals: number;
    };
    recentTransactions: {
        id: string;
        type: 'CREDIT' | 'DEBIT';
        points: number;
        referenceType: string;
        createdAt: string;
        user: { name: string };
        from: { id: string; name: string } | null;
    }[];
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface UserListItem {
    id: string;
    name: string;
    phone: string;
    role: 'USER' | 'ADMIN';
    // ✅ no code — users list table doesn't need it
    isActive: boolean;
    createdAt: string;
    totalAccounts: number;
    sponsor: { name: string; id: string } | null; // ✅ id not code
}

export interface UserDetails {
    id: string;
    name: string;
    phone: string;
    role: 'USER' | 'ADMIN';
    code: string; // ✅ ONLY here — user detail page shows referral code
    isActive: boolean;
    isRegistrationPayment: boolean;
    createdAt: string;
    sponsor: { id: string; name: string; phone: string } | null; // ✅ no code
    bankDetails: {
        bankName: string;
        accountNumber: string;
        accountType: string;
        ifscCode: string;
        upiId: string | null;
    } | null;
    wallets: { type: 'SPEND' | 'INCENTIVE' | 'WITHDRAWAL'; balance: number }[];
    accounts: {
        id: string;
        matrixPosition: number;
        entryType: 'REGISTRATION' | 'REENTRY';
        createdAt: string;
        parent: {
            matrixPosition: number;
            user: { name: string; id: string }; // ✅ id not code
        } | null;
    }[];
}

export interface WalletTransaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    points: number;
    referenceType: string;
    description: string;
    createdAt: string;
    wallet: { type: 'SPEND' | 'INCENTIVE' | 'WITHDRAWAL' };
}

export interface WithdrawalRequest {
    id: string;
    pointsRequested: number;
    serviceFee: number;
    amountToTransfer: number;
    status: 'PENDING' | 'REJECTED' | 'COMPLETED';
    createdAt: string;
}

export interface BillRequest {
    id: string;
    amount: number;
    charge: number;
    totalDebit: number;
    category: string | null;
    description: string | null;
    status: 'PENDING' | 'COMPLETED' | 'REJECTED';
    createdAt: string;
}

export interface AutoPay {
    id: string;
    beneficiaryName: string;
    bankName: string;
    amount: number;
    dueDate: 'FIVE' | 'TEN' | 'FIFTEEN';
    category: string;
    status: string;
    createdAt: string;
}

export interface ReentryQueueItem {
    id: string;
    createdAt: string;
    user: {
        id: string;
        name: string;
        phone: string;
        // ✅ no code
        isActive: boolean;
        accounts: {
            id: string;
            matrixPosition: number;
            entryType: 'REGISTRATION' | 'REENTRY';
            createdAt: string;
        }[];
        wallets: { type: 'SPEND' | 'INCENTIVE' | 'WITHDRAWAL'; balance: number }[];
    };
}

export interface ReentryQueueResponse {
    items: ReentryQueueItem[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface WalletUser {
    id: string;
    name: string;
    phone: string;
    role: 'USER' | 'ADMIN';
    // ✅ no code
    spend: number;
    incentive: number;
    withdrawal: number;
}

export interface WalletTotals {
    SPEND: number;
    INCENTIVE: number;
    WITHDRAWAL: number;
}

export interface AdjustWalletPayload {
    walletType: 'SPEND' | 'INCENTIVE' | 'WITHDRAWAL';
    adjustmentType: 'CREDIT' | 'DEBIT';
    amount: number;
    reason: string;
}

export interface AdminTransaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    points: number;
    referenceType: string;
    description: string;
    walletType: 'SPEND' | 'INCENTIVE' | 'WITHDRAWAL';
    createdAt: string;
    user: { id: string; name: string; phone: string }; // ✅ no code
    from: { id: string; name: string } | null;
}

export interface AdminWithdrawalBankDetails {
    bankName: string;
    accountNumber: string;
    accountType: 'SAVINGS' | 'CURRENT';
    ifscCode: string;
    upiId: string | null;
    qrCode: string | null;
    gPay: string | null;
}

export interface AdminWithdrawal {
    id: string;
    status: 'PENDING' | 'REJECTED' | 'COMPLETED';
    pointsRequested: number;
    serviceFee: number;
    amountToTransfer: number;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        name: string;
        phone: string;
        // ✅ no code
        bankDetails: AdminWithdrawalBankDetails | null;
    };
}

export interface WithdrawalSummary {
    PENDING: { count: number; amount: number };
    COMPLETED: { count: number; amount: number };
    REJECTED: { count: number; amount: number };
}


export type BillStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface BillRequestPage {
    id: string;
    amount: number;
    charge: number;
    totalDebit: number;
    billImageUrl: string | null;
    description: string | null;
    category: string | null;
    status: BillStatus;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        name: string;
        phone: string;
        bankDetails: AdminWithdrawalBankDetails | null;
    };
}
