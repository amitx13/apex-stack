import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { OperatorCode, prisma, TransactionType } from "@repo/db";
import jwt from 'jsonwebtoken';
import { customAlphabet } from 'nanoid'
import { getConflictingFields, getReadableFieldName } from "../utils/prismaErrorHelper.js";
import { SignUpVendor } from "@repo/types";

export const login = async (req: Request, res: Response) => {
    const { phone, password, role } = req.body;

    if (!phone || !password || !role) {
        throw new ApiError(400, "Mobile number, password and role are required");
    }

    if (role !== 'USER' && role !== 'VENDOR') {
        throw new ApiError(400, "Invalid role. Must be 'USER' or 'VENDOR'");
    }

    let user;

    if (role === 'USER') {
        user = await prisma.user.findUnique({
            where: {
                phone,
            },
            select: {
                id: true,
                role: true,
                password: true,
            }
        });
    } else {
        user = await prisma.vendor.findUnique({
            where: {
                phone,
            },
            select: {
                id: true,
                role: true,
                password: true,
            }
        });
    }


    if (!user) {
        throw new ApiError(404, "Account not found. Please sign up first.");
    }

    if (user.role === "ADMIN") {
        throw new ApiError(404, "Failed login attempt for administrative account. On the User app");
    }

    if (user.password !== password) {
        throw new ApiError(401, "Invalid password");
    }

    const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    res.json({
        success: true,
        token,
        message: "Logged in",
    });
};

export function generateGHId(): string {
    const num = Math.floor(1000000 + Math.random() * 9000000); // 7 digits
    return `IUS-${num}`;
}

export const nanoidAlphaNum = customAlphabet(
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    6
);

export function generateReferalCode() {
    return nanoidAlphaNum();
}

export async function createUserSafely(data: {
    name: string;
    password: string;
    phone: string;
    gasConsumerNumber: string;
    sponsorId: string;
}) {
    const MAX_RETRIES = 8;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            return await prisma.user.create({
                data: {
                    id: generateGHId(),
                    code: generateReferalCode(),
                    ...data
                }
            });

        } catch (err: any) {

            if (err.code === "P2002") {
                const fields = getConflictingFields(err);

                // Retry for auto-generated fields
                if (fields?.includes("id") || fields?.includes("code")) {
                    continue;
                }

                // User-friendly error for duplicate data
                if (fields && fields.length > 0) {
                    const fieldName = getReadableFieldName(fields[0]);
                    throw new ApiError(409, `${fieldName} already registered`);
                }

                throw new ApiError(409, "User already exists");
            }

            throw err;
        }
    }

    throw new ApiError(500, "Failed to create user. Please try again.");
}

export const createNewUserAccount = async (req: Request, res: Response) => {
    const { name, phone, gasConsumerNumber, referralCode, password } = req.body;

    if (!name || !password || !phone || !gasConsumerNumber || !referralCode) {
        throw new ApiError(400, "Missing required fields");
    }

    const sponsor = await prisma.user.findUnique({
        where: { code: referralCode },
        select: { id: true, isActive: true }
    });

    if (!sponsor) throw new ApiError(400, "Invalid referral code");
    if (!sponsor.isActive) throw new ApiError(400, "Sponsor account not active");

    const user = await createUserSafely({
        name,
        password,
        phone,
        gasConsumerNumber,
        sponsorId: sponsor.id
    });

    const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
    );

    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            role: user.role,
            isActive: user.isActive,
            gasConsumerNumber: user.gasConsumerNumber,
            isRegistrationPayment: user.isRegistrationPayment,
        },
        message: "Signing up..."
    });
};

export const createNewVendorAccount = async (req: Request, res: Response) => {

    const validatedData = await SignUpVendor.safeParseAsync(req.body);

    if (!validatedData.success) {
        throw new ApiError(
            400,
            validatedData.error.issues.map((err) => err.message).join(", ")
        );
    }

    const {
        name,
        phone,
        password,
        shopName,
        category,
        pincode,
        panNumber,
        aadharNumber,
        referralCode,
        gstNumber
    } = validatedData.data;

    const existingVendor = await prisma.vendor.findFirst({
        where: {
            OR: [
                { phone },
                { panNumber },
                { aadharNumber },
                ...(gstNumber ? [{ gstNumber }] : [])
            ]
        }
    });

    if (existingVendor) {
        throw new ApiError(409, "Vendor with this phone, PAN, Aadhar, or GST already exists");
    }

    const sponsor = await prisma.user.findUnique({
        where: { code: referralCode },
        select: { id: true, isActive: true }
    });

    if (!sponsor) throw new ApiError(400, "Invalid referral code");
    if (!sponsor.isActive) throw new ApiError(400, "Sponsor account not active");

    const vendor = await prisma.vendor.create({
        data: {
            ownerName: name,
            phone,
            password,
            shopName,
            category,
            pincode,
            panNumber,
            aadharNumber,
            gstNumber: gstNumber || null,
            sponsor: {
                connect: { id: sponsor.id },
            },
            approvalStatus: "PENDING",
            commissionRate: 0.0
        },
    });


    const token = jwt.sign(
        { userId: vendor.id, role: vendor.role },
        process.env.JWT_SECRET!,
        { expiresIn: "7d" }
    );

    res.json({
        success: true,
        token,
        user: {
            id: vendor.id,
            name: vendor.ownerName,
            phone: vendor.phone,
            role: vendor.role,
            isActive: vendor.isActive,
            commissionRate: vendor.commissionRate,
            approvalStatus: vendor.approvalStatus,
            shopName: vendor.shopName,
            category: vendor.category,
            isBankAdded: null,
        },
        message: "Signing up..."
    });
};

export const fetchMe = async (req: Request, res: Response) => {

    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }
    if (role === 'USER') {

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
                role: "USER"
            },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                code: true,
                isActive: true,
                gasConsumerNumber: true,
                isRegistrationPayment: true,
                bankDetails: true,
            }
        });

        if (!user) {
            throw new ApiError(404, "User account not found. Please sign up first.");
        }

        // console.log(user)
        const membersCount = await prisma.userAccount.count({
            where: {
                parent: {
                    userId: userId,
                    entryType: "REGISTRATION",
                },
            },
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                code: user.code,
                isActive: user.isActive,
                gasConsumerNumber: user.gasConsumerNumber,
                isRegistrationPayment: user.isRegistrationPayment,
                membersCount,
                isBankAdded: user.bankDetails !== null
            },
        });
    } else {
        const vendor = await prisma.vendor.findUnique({
            where: {
                id: userId,
                role: "VENDOR"
            },
            select: {
                id: true,
                ownerName: true,
                phone: true,
                role: true,
                isActive: true,
                shopName: true,
                category: true,
                commissionRate: true,
                approvalStatus: true,
                bankDetails: true
            }
        });

        if (!vendor) {
            throw new ApiError(404, "Vendor account not found. Please sign up first.");
        }

        res.json({
            success: true,
            user: {
                id: vendor.id,
                name: vendor.ownerName,
                phone: vendor.phone,
                role: vendor.role,
                isActive: vendor.isActive,
                commissionRate: vendor.commissionRate,
                approvalStatus: vendor.approvalStatus,
                shopName: vendor.shopName,
                category: vendor.category,
                isBankAdded: vendor.bankDetails !== null
            },
        });
    }
}

export const getBankDetails = async (req: Request, res: Response) => {

    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }
    if (role === 'USER') {

        const userBank = await prisma.bankDetail.findUnique({
            where: {
                userId,
            },
            select: {
                id: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                accountType: true,
                upiId: true,
                qrCode: true,
                gPay: true,
            }
        });

        if (!userBank) {
            throw new ApiError(404, "User bank account not found. Please add bank account.");
        }

        res.json({
            success: true,
            data: {
                id: userBank.id,
                bankName: userBank.bankName,
                accountNumber: userBank.accountNumber,
                ifscCode: userBank.ifscCode,
                accountType: userBank.accountType,
                upiId: userBank.upiId,
                qrCode: userBank.qrCode,
                gPay: userBank.gPay
            },
        });
    } else {
        const vendorBank = await prisma.vendorBankDetail.findUnique({
            where: {
                vendorId: userId,
            },
            select: {
                id: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                accountType: true,
                upiId: true,
                qrCode: true,
                gPay: true,
            }
        });

        if (!vendorBank) {
            throw new ApiError(404, "Vendor bank account not found. Please add bank account.");
        }

        res.json({
            success: true,
            data: {
                id: vendorBank.id,
                bankName: vendorBank.bankName,
                accountNumber: vendorBank.accountNumber,
                ifscCode: vendorBank.ifscCode,
                accountType: vendorBank.accountType,
                upiId: vendorBank.upiId,
                qrCode: vendorBank.qrCode,
                gPay: vendorBank.gPay
            },
        });
    }
}

export const getProfileDetails = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const role = req.user?.role;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }
    if (role === 'USER') {

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                phone: true,
                code: true,
                password: true,
                gasConsumerNumber: true,
                createdAt: true,
                sponsor: {
                    select: { name: true, phone: true },
                },
            },
        });

        if (!user) throw new ApiError(404, 'User not found');

        res.status(200).json({ success: true, data: user });
    } else {
        const vendor = await prisma.vendor.findUnique({
            where: {
                id: userId,
            },
            select: {
                ownerName: true,
                phone: true,
                password: true,
                commissionRate: true,
                sponsor: {
                    select: {
                        name: true,
                        phone: true
                    }
                },
                isActive: true,
                approvalStatus: true,
                rejectionReason: true,
                shopName: true,
                category: true,
                pincode: true,
                panNumber: true,
                aadharNumber: true,
                gstNumber: true,
                createdAt: true,
            }
        });

        if (!vendor) {
            throw new ApiError(404, "Vendor account not found.");
        }

        res.json({
            success: true,
            data: {
                ownerName: vendor.ownerName,
                phone: vendor.phone,
                password: vendor.password,
                commissionRate: vendor.commissionRate,
                sponsorName: vendor.sponsor?.name || '',
                sponsorPhone: vendor.sponsor?.phone || '',
                isActive: vendor.isActive,
                approvalStatus: vendor.approvalStatus,
                rejectionReason: vendor.rejectionReason,
                shopName: vendor.shopName,
                category: vendor.category,
                pincode: vendor.pincode,
                panNumber: vendor.panNumber,
                aadharNumber: vendor.aadharNumber,
                gstNumber: vendor.gstNumber,
                createdAt: vendor.createdAt.toISOString(),
            },
        });
    }
}

export const updateUserProfile = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const { name, phone, password, gasConsumerNumber } = req.body;

    // ── Fetch existing user ───────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!existing) throw new ApiError(404, 'User not found');

    // ── Phone uniqueness check ────────────────────────────────────────────────
    if (phone && phone !== existing.phone) {
        const phoneTaken = await prisma.user.findFirst({
            where: { phone, NOT: { id: userId } },
        });
        if (phoneTaken) throw new ApiError(409, 'Phone number already in use');
    }

    // ── Gas consumer number uniqueness check ──────────────────────────────────
    if (gasConsumerNumber && gasConsumerNumber !== existing.gasConsumerNumber) {
        const gasTaken = await prisma.user.findFirst({
            where: { gasConsumerNumber, NOT: { id: userId } },
        });
        if (gasTaken) throw new ApiError(409, 'Gas consumer number already in use');
    }

    // ── Build update payload ──────────────────────────────────────────────────
    const data: any = {};
    if (name) data.name = name.trim();
    if (phone) data.phone = phone.trim();
    if (password) data.password = password.trim();
    if (gasConsumerNumber !== undefined) data.gasConsumerNumber = gasConsumerNumber?.trim() || null;

    // ── Update ────────────────────────────────────────────────────────────────
    const updated = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
            name: true,
            phone: true,
            gasConsumerNumber: true,
        },
    });

    res.status(200).json({ success: true, data: updated });
};

export const getWithdrawalBalance = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = await prisma.wallet.findUnique({
        where: {
            userId_type: {
                userId,
                "type": "WITHDRAWAL",
            },
        },
        select: {
            balance: true
        }
    })

    if (!user) throw new ApiError(404, "user wallet not Found")

    res.status(200).json({
        success: true,
        data: user.balance,
    });
}

export const userWallerBal = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = await prisma.wallet.findUnique({
        where: {
            userId_type: {
                userId,
                "type": "SPEND",
            },
        },
        select: {
            balance: true
        }
    })

    if (!user) throw new ApiError(404, "user wallet not Found")

    res.status(200).json({
        success: true,
        data: user.balance,
    });
}

export async function getWalletTransactionsController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const type = req.query.type as 'CREDIT' | 'DEBIT' | undefined;

    // Validate type if provided
    if (type && !['CREDIT', 'DEBIT'].includes(type)) {
        throw new ApiError(400, 'Invalid type filter. Must be CREDIT or DEBIT');
    }

    const result = await getUserWalletTransactions({ userId, page, limit, type });

    return res.status(200).json({
        success: true,
        data: result,
        message: 'Transactions fetched successfully'
    });
}

interface GetTransactionsParams {
    userId: string;
    page: number;
    limit: number;
    type?: 'CREDIT' | 'DEBIT';
}

export async function getUserWalletTransactions({
    userId,
    page,
    limit,
    type,
}: GetTransactionsParams) {
    const skip = (page - 1) * limit;

    const where = {
        userId,
        ...(type && { type: type as TransactionType }),
    };

    const [total, transactions] = await Promise.all([
        prisma.walletTransaction.count({ where }),
        prisma.walletTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
                id: true,
                type: true,
                points: true,
                description: true,
                referenceType: true,
                referenceId: true,
                createdAt: true,
                wallet: { select: { type: true } },
                serviceTransaction: {
                    select: {
                        serviceType: true,
                        operatorName: true,
                        mobileNumber: true,
                        status: true,
                        amount: true,
                    },
                },
            },
        }),
    ]);

    // ── Batch collect IDs per type ─────────────────────────────────────────────
    const userAccountIds = new Set<string>();
    const vendorIds = new Set<string>();
    const userIds = new Set<string>();

    for (const txn of transactions) {
        switch (txn.referenceType) {
            case 'REGISTRATION':
            case 'REENTRY':
                userAccountIds.add(txn.referenceId);
                break;
            case 'VENDOR_PAYMENT':
            case 'VENDOR_COMMISSION':
                vendorIds.add(txn.referenceId);
                break;
            case 'USER_COMMISSION':
                userIds.add(txn.referenceId);
                break;
            // ✅ These reference their own IDs — nothing to batch fetch
            case 'REENTRY_DEBIT':
            case 'RECHARGE':
            case 'RECHARGE_REFUND':
            case 'WITHDRAWAL':
            case 'WITHDRAWAL_REFUND':
            case 'BILL_REQUEST':
            case 'BILL_REFUND':
            case 'AUTOPAY':
            case 'AUTOPAY_REFUND':
                break;
        }
    }

    // ── Batch fetch — max 3 queries for the whole page ────────────────────────
    const [userAccounts, vendors, users] = await Promise.all([
        userAccountIds.size > 0
            ? prisma.userAccount.findMany({
                where: { id: { in: [...userAccountIds] } },
                select: {
                    id: true,
                    user: { select: { name: true } },
                },
            })
            : [],
        vendorIds.size > 0
            ? prisma.vendor.findMany({
                where: { id: { in: [...vendorIds] } },
                select: {
                    id: true,
                    shopName: true,
                    ownerName: true,
                    category: true,
                },
            })
            : [],
        userIds.size > 0
            ? prisma.user.findMany({
                where: { id: { in: [...userIds] } },
                select: {
                    id: true,
                    name: true,
                },
            })
            : [],
    ]);

    // ── Build O(1) lookup maps ────────────────────────────────────────────────
    const userAccountMap = new Map(userAccounts.map(ua => [ua.id, ua.user.name]));
    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    const userMap = new Map(users.map(u => [u.id, u.name]));

    // ── Stitch enrichment ─────────────────────────────────────────────────────
    const enriched = transactions.map(txn => {
        let enrichment: Record<string, any> | null = null;

        switch (txn.referenceType) {
            case 'REGISTRATION': {
                const name = userAccountMap.get(txn.referenceId);
                enrichment = {
                    type: 'USER',
                    label: 'Registration bonus from',
                    name: name ?? 'Unknown',
                };
                break;
            }
            case 'REENTRY': {
                const name = userAccountMap.get(txn.referenceId);
                enrichment = {
                    type: 'USER',
                    label: 'Re-entry bonus from',
                    name: name ?? 'Unknown',
                };
                break;
            }
            case 'REENTRY_DEBIT': {
                // queueId — nothing to enrich
                enrichment = null;
                break;
            }
            case 'VENDOR_PAYMENT': {
                const vendor = vendorMap.get(txn.referenceId);
                enrichment = vendor
                    ? { type: 'VENDOR', label: 'Paid to', ...vendor }
                    : null;
                break;
            }
            case 'VENDOR_COMMISSION': {
                const vendor = vendorMap.get(txn.referenceId);
                enrichment = vendor
                    ? { type: 'VENDOR', label: 'Commission from', ...vendor }
                    : null;
                break;
            }
            case 'USER_COMMISSION': {
                const name = userMap.get(txn.referenceId);
                enrichment = {
                    type: 'USER',
                    label: 'Commission from',
                    name: name ?? 'Unknown',
                };
                break;
            }
            case 'WITHDRAWAL':
                enrichment = null;
                break;

            case 'WITHDRAWAL_REFUND':
                enrichment = null;
                break;

            case 'BILL_REQUEST':
                enrichment = null;
                break;

            case 'BILL_REFUND':
                enrichment = null;
                break;

            case 'AUTOPAY':
                enrichment = null;
                break;

            case 'AUTOPAY_REFUND':
                enrichment = null;
                break;

            // RECHARGE & RECHARGE_REFUND handled via serviceTransaction on FE
        }

        return {
            id: txn.id,
            type: txn.type,
            points: txn.points,
            description: txn.description,
            referenceType: txn.referenceType,
            createdAt: txn.createdAt,
            wallet: txn.wallet,
            serviceTransaction: txn.serviceTransaction,
            enrichment,
            // ✅ referenceId intentionally stripped — never expose raw IDs
        };
    });

    return {
        transactions: enriched,
        pagination: {
            total,
            page,
            limit,
            hasMore: skip + transactions.length < total,
        },
    };
}

export async function getReferralsController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const result = await getUserReferrals(userId);

    return res.status(200).json({
        success: true,
        data: result,
        message: 'Referrals fetched successfully'
    });
}

export async function getUserReferrals(sponsorId: string) {
    const [users, vendors] = await Promise.all([
        prisma.user.findMany({
            where: { sponsorId },
            select: {
                id: true,
                name: true,
                phone: true,
                code: true,
                isActive: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.vendor.findMany({
            where: { sponsorId },
            select: {
                id: true,
                shopName: true,
                ownerName: true,
                phone: true,
                category: true,
                isActive: true,
                commissionRate: true,
                approvalStatus: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return {
        users: {
            data: users,
            total: users.length,
        },
        vendors: {
            data: vendors,
            total: vendors.length,
        },
    };
}

const CATEGORY_ORDER = [
    'Monthly_packs',
    'Unlimited_5g_plans',
    'Top_data_packs',
    'Unlimited',
    'Talktime_plans',
];

export async function getRechargePlans(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const operatorCode = req.query.operatorCode as string | undefined;
    if (!operatorCode) throw new ApiError(400, 'operatorCode is required');

    const plans = await prisma.rechargePlan.findMany({
        where: { operatorCode: operatorCode as OperatorCode, isActive: true },
        orderBy: { amount: 'asc' },
    });

    const grouped = plans.reduce((acc: Record<string, { title: string; plans: any[] }>, plan) => {
        const key = plan.category;
        if (!acc[key]) acc[key] = { title: key.replace(/_/g, ' '), plans: [] };
        acc[key].plans.push({
            rs: plan.amount.toString(),
            data: plan.data,
            calls: plan.calls,
            validity: plan.validity,
        });
        return acc;
    }, {});

    // Enforce fixed display order, skip missing categories
    const sorted = CATEGORY_ORDER
        .filter((cat) => grouped[cat])
        .map((cat) => grouped[cat]);

    res.json({ success: true, data: sorted });
}