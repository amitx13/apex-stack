import { Request, Response } from 'express';
import { Prisma, prisma, Role } from '@repo/db';
import { ApiError } from '../../utils/ApiError';
import { updateUserAccountAfterPayment } from '../../services/user-account.service';
import { handleCommissionSplit } from '../../services/scanPay.service';
import { getAdminSystemIds } from '../../utils/system';
import { imwalletAPIService } from '../../services/imwallet-api.service';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

// ── 1. GET /admin/users ────────────────────────────────────
export const getUsers = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || 'ALL';
    const skip = (page - 1) * limit;

    const where = {
        role: {
            in: [Role.USER, Role.ADMIN],
        },
        ...(status === 'ACTIVE' && { isActive: true }),
        ...(status === 'NOT_ACTIVATED' && { isActive: false }),
        ...(search && {
            OR: [
                { name: { contains: search, mode: 'insensitive' } as const },
                { phone: { contains: search } },
                { id: { contains: search } },
            ],
        }),
    };

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                isActive: true,
                createdAt: true,
                sponsor: {
                    select: { name: true, id: true }
                },
                accounts: {
                    select: { id: true }
                },
            },
        }),
        prisma.user.count({ where }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            users: users.map(u => ({
                ...u,
                totalAccounts: u.accounts.length,
                accounts: undefined,
            })),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── 2. GET /admin/users/:userId ────────────────────────────
export const getUserDetails = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== 'string') {
        throw new ApiError(400, "Invalid userId.");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            code: true,
            isActive: true,
            isRegistrationPayment: true,
            createdAt: true,
            sponsor: {
                select: { id: true, name: true, phone: true }
            },
            bankDetails: {
                select: {
                    bankName: true,
                    accountNumber: true,
                    accountType: true,
                    ifscCode: true,
                    upiId: true,
                }
            },
            wallets: {
                select: { type: true, balance: true }
            },
            accounts: {
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    matrixPosition: true,
                    entryType: true,
                    createdAt: true,
                    parent: {
                        select: {
                            matrixPosition: true,
                            user: {
                                select: { name: true, id: true }
                            }
                        }
                    },
                }
            },
        },
    });

    if (!user) throw new ApiError(404, "Member not found.");

    res.status(200).json({ success: true, data: user });
};

// ── 3. GET /admin/users/:userId/transactions ───────────────
export const getUserTransactions = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== 'string') {
        throw new ApiError(400, "Invalid userId.");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                points: true,
                referenceType: true,
                description: true,
                createdAt: true,
                wallet: { select: { type: true } },
            },
        }),
        prisma.walletTransaction.count({ where: { userId } }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── 4. GET /admin/users/:userId/withdrawals ────────────────
export const getUserWithdrawals = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== 'string') {
        throw new ApiError(400, "Invalid userId.");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
        prisma.withdrawalRequest.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                pointsRequested: true,
                serviceFee: true,
                amountToTransfer: true,
                status: true,
                createdAt: true,
            },
        }),
        prisma.withdrawalRequest.count({ where: { userId } }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            withdrawals,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── 5. GET /admin/users/:userId/bills ──────────────────────
export const getUserBills = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== 'string') {
        throw new ApiError(400, "Invalid userId.");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
        prisma.billRequest.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                amount: true,
                charge: true,
                totalDebit: true,
                category: true,
                description: true,
                status: true,
                createdAt: true,
            },
        }),
        prisma.billRequest.count({ where: { userId } }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            bills,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── 6. GET /admin/users/:userId/autopay ───────────────────
export const getUserAutoPay = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== 'string') {
        throw new ApiError(400, "Invalid userId.");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;

    const [autoPays, total] = await Promise.all([
        prisma.autoPay.findMany({
            where: { userId },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                beneficiaryName: true,
                bankName: true,
                amount: true,
                dueDate: true,
                category: true,
                status: true,
                createdAt: true,
            },
        }),
        prisma.autoPay.count({ where: { userId } }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            autoPays,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── 7. POST /admin/users/:userId/activate ─────────────────
export const activateUser = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (typeof userId !== 'string') {
        throw new ApiError(400, "Invalid userId.");
    }

    if (!userId) {
        throw new ApiError(400, "User Id is required.");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true, name: true }
    });

    if (!user) throw new ApiError(404, "Member not found.");
    if (user.isActive) throw new ApiError(400, "This member is already active.");

    await updateUserAccountAfterPayment(user.id);

    res.status(200).json({
        success: true,
        message: `${user.name}'s account has been activated successfully.`,
    });
};

export const getReentryQueue = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    const where: Prisma.ReentryQueueWhereInput = {
        status: "PENDING",
        ...(search
            ? {
                OR: [
                    { user: { is: { name: { contains: search, mode: "insensitive" } } } },
                    { user: { is: { phone: { contains: search } } } },
                    { user: { is: { id: { contains: search } } } },
                ],
            }
            : {}),
    };

    const [items, total] = await Promise.all([
        prisma.reentryQueue.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                createdAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        isActive: true,
                        accounts: {
                            select: {
                                id: true,
                                matrixPosition: true,
                                entryType: true,
                                createdAt: true,
                            },
                            orderBy: { createdAt: "asc" },
                        },
                        wallets: {
                            select: { type: true, balance: true },
                        },
                    },
                },
            },
        }),
        prisma.reentryQueue.count({ where }),
    ]);

    res.status(200).json({
        success: true,
        data: {
            items,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── 1. GET /admin/wallets ──────────────────────────────────
export const getWallets = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const userWhere: Prisma.UserWhereInput = {
        role: { in: [Role.USER, Role.ADMIN] },
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search } },
                    { id: { contains: search } },
                ],
            }
            : {}),
    };

    const [users, total, walletTotals] = await Promise.all([
        prisma.user.findMany({
            where: userWhere,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                wallets: {
                    select: { type: true, balance: true }
                },
            },
        }),

        prisma.user.count({ where: userWhere }),

        // Total balance across ALL users per wallet type
        prisma.wallet.groupBy({
            by: ['type'],
            _sum: { balance: true },
        }),
    ]);

    // Shape wallet totals into a clean object
    const totals = {
        SPEND: 0,
        INCENTIVE: 0,
        WITHDRAWAL: 0,
    };
    for (const wt of walletTotals) {
        totals[wt.type] = Number(wt._sum.balance ?? 0);
    }

    // Shape per-user wallets into a map
    const shaped = users.map(u => {
        const walletMap = Object.fromEntries(
            u.wallets.map(w => [w.type, Number(w.balance)])
        );
        return {
            id: u.id,
            name: u.name,
            phone: u.phone,
            role: u.role,
            spend: walletMap['SPEND'] ?? 0,
            incentive: walletMap['INCENTIVE'] ?? 0,
            withdrawal: walletMap['WITHDRAWAL'] ?? 0,
        };
    });

    res.status(200).json({
        success: true,
        data: {
            users: shaped,
            totals,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── 2. POST /admin/wallets/:userId/adjust ──────────────────
export const adjustWallet = async (req: Request, res: Response) => {
    const { userId } = req.params;
    if (typeof userId !== 'string') {
        throw new ApiError(400, 'Invalid userId');
    }

    const { walletType, adjustmentType, amount, reason } = req.body;

    if (!walletType || !adjustmentType || !amount || !reason) {
        throw new ApiError(400, 'All fields are required.');
    }

    if (!['SPEND', 'INCENTIVE', 'WITHDRAWAL'].includes(walletType)) {
        throw new ApiError(400, 'Invalid wallet type.');
    }

    if (!['CREDIT', 'DEBIT'].includes(adjustmentType)) {
        throw new ApiError(400, 'Adjustment type must be CREDIT or DEBIT.');
    }

    if (amount <= 0) {
        throw new ApiError(400, 'Amount must be greater than 0.');
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true }
    });

    if (!user) throw new ApiError(404, 'Member not found.');

    // Check sufficient balance for DEBIT
    if (adjustmentType === 'DEBIT') {
        const wallet = await prisma.wallet.findUnique({
            where: { userId_type: { userId, type: walletType } },
            select: { balance: true },
        });

        if (!wallet) throw new ApiError(404, 'Wallet not found.');

        if (wallet.balance.lt(amount)) {
            throw new ApiError(400, `Insufficient balance. Current balance: ${wallet.balance}`);
        }
    }

    await prisma.$transaction(async (tx) => {
        // Update wallet balance
        const wallet = await tx.wallet.update({
            where: { userId_type: { userId, type: walletType } },
            data: {
                balance: adjustmentType === 'CREDIT'
                    ? { increment: amount }
                    : { decrement: amount },
            },
        });

        // Create wallet transaction record
        await tx.walletTransaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: adjustmentType,
                points: new Decimal(amount),
                description: `Admin adjustment: ${reason}`,
                referenceType: 'ADMIN_ADJUSTMENT',
                referenceId: userId,
            },
        });
    });

    res.status(200).json({
        success: true,
        message: `${user.name}'s ${walletType.toLowerCase()} wallet has been ${adjustmentType === 'CREDIT' ? 'credited' : 'debited'} with ${amount} points.`,
    });
};

export const getTransactions = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const type = (req.query.type as string) || ''; // CREDIT | DEBIT
    const wallet = (req.query.wallet as string) || ''; // SPEND | INCENTIVE | WITHDRAWAL
    const refType = (req.query.refType as string) || ''; // REGISTRATION | REENTRY | etc.
    const from = (req.query.from as string) || ''; // date string
    const to = (req.query.to as string) || ''; // date string
    const skip = (page - 1) * limit;

    const where: any = {
        ...(type && { type }),
        ...(wallet && { wallet: { type: wallet } }),
        ...(refType && { referenceType: refType }),
        ...(from || to) && {
            createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
        },
        ...(search && {
            user: {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { id: { contains: search } },
                ],
            },
        }),
    };

    const [rawTransactions, total] = await Promise.all([
        prisma.walletTransaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                points: true,
                referenceType: true,
                referenceId: true,
                description: true,
                createdAt: true,
                wallet: {
                    select: { type: true },
                },
                user: {
                    select: { id: true, name: true, phone: true },
                },
            },
        }),
        prisma.walletTransaction.count({ where }),
    ]);

    // ── Enrich referenceIds ────────────────────────────────
    const userAccountIds = new Set<string>();
    const vendorIds = new Set<string>();
    const userIds = new Set<string>();

    for (const txn of rawTransactions) {
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
        }
    }

    const [userAccounts, vendors, users] = await Promise.all([
        userAccountIds.size > 0
            ? prisma.userAccount.findMany({
                where: { id: { in: [...userAccountIds] } },
                select: { id: true, user: { select: { id: true, name: true } } },
            })
            : [],
        vendorIds.size > 0
            ? prisma.vendor.findMany({
                where: { id: { in: [...vendorIds] } },
                select: { id: true, shopName: true, ownerName: true },
            })
            : [],
        userIds.size > 0
            ? prisma.user.findMany({
                where: { id: { in: [...userIds] } },
                select: { id: true, name: true },
            })
            : [],
    ]);

    const userAccountMap = new Map(userAccounts.map(ua => [ua.id, ua.user]));
    const vendorMap = new Map(vendors.map(v => [v.id, v]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const transactions = rawTransactions.map(txn => {
        let from: { id: string; name: string } | null = null;

        switch (txn.referenceType) {
            case 'REGISTRATION':
            case 'REENTRY': {
                const u = userAccountMap.get(txn.referenceId);
                if (u) from = u;
                break;
            }
            case 'VENDOR_PAYMENT':
            case 'VENDOR_COMMISSION': {
                const v = vendorMap.get(txn.referenceId);
                if (v) from = { id: v.id, name: v.shopName };
                break;
            }
            case 'USER_COMMISSION': {
                const u = userMap.get(txn.referenceId);
                if (u) from = u;
                break;
            }
        }

        return {
            id: txn.id,
            type: txn.type,
            points: Number(txn.points),
            referenceType: txn.referenceType,
            description: txn.description,
            walletType: txn.wallet.type,
            createdAt: txn.createdAt,
            user: txn.user,
            from,
        };
    });

    res.status(200).json({
        success: true,
        data: {
            transactions,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

export const getWithdrawals = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {
        ...(status && { status }),
        ...((from || to) && {
            createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
        }),
        ...(search && {
            user: {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { id: { contains: search } },
                ],
            },
        }),
    };

    const [withdrawals, total, summaryAll] = await Promise.all([
        prisma.withdrawalRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { status: 'asc' },
                { createdAt: 'asc' },
            ],
            select: {
                id: true,
                status: true,
                pointsRequested: true,
                serviceFee: true,
                amountToTransfer: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        bankDetails: {
                            select: {
                                bankName: true,
                                accountNumber: true,
                                accountType: true,
                                ifscCode: true,
                                upiId: true,
                                qrCode: true,
                                gPay: true,
                            },
                        },
                    },
                },
            },
        }),

        prisma.withdrawalRequest.count({ where }),

        prisma.withdrawalRequest.groupBy({
            by: ['status'],
            _count: { id: true },
            _sum: { amountToTransfer: true },
        }),
    ]);

    const summary: Record<string, { count: number; amount: number }> = {
        PENDING: { count: 0, amount: 0 },
        COMPLETED: { count: 0, amount: 0 },
        REJECTED: { count: 0, amount: 0 },
    };
    for (const s of summaryAll) {
        summary[s.status] = {
            count: s._count.id,
            amount: Number(s._sum.amountToTransfer ?? 0),
        };
    }

    res.status(200).json({
        success: true,
        data: {
            withdrawals: withdrawals.map(w => ({
                ...w,
                pointsRequested: Number(w.pointsRequested),
                serviceFee: Number(w.serviceFee),
                amountToTransfer: Number(w.amountToTransfer),
            })),
            summary,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

export const updateWithdrawal = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action, remarks } = req.body;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Invalid Id');
    }

    if (!['REJECT', 'COMPLETE'].includes(action)) {
        throw new ApiError(400, 'Invalid action. Must be COMPLETE or REJECT.');
    }

    if (action === 'COMPLETE') {
        await completeWithdrawal(id, remarks);
    } else {
        await rejectWithdrawal(id, remarks);
    }

    // ✅ messages defined inline
    const messages: Record<string, string> = {
        COMPLETE: 'Withdrawal marked as completed.',
        REJECT: 'Withdrawal rejected and amount refunded.',
    };

    res.status(200).json({ success: true, message: messages[action] });
};

// ── Admin: Complete withdrawal ─────────────────────────────────────────────────
export async function completeWithdrawal(withdrawalId: string, remarks?: string) {
    const { adminId } = await getAdminSystemIds();

    const request = await prisma.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        select: {
            status: true,
            serviceFee: true,
            user: {
                select: {
                    id: true,
                    sponsorId: true,
                }
            },
            pointsRequested: true,
        }
    });

    if (!request) throw new ApiError(404, 'Withdrawal request not found');

    if (request.status !== 'PENDING') {
        throw new ApiError(400, `Cannot complete a ${request.status} request`);
    }

    await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
            status: 'COMPLETED',
            ...(remarks && { remarks }),
        },
    });

    await handleCommissionSplit(
        request.serviceFee,
        request.user.sponsorId,
        adminId,
        `Withdrawal commission from user ${request.user.id} (6% of ₹${request.pointsRequested})`,
        'USER_COMMISSION',
        request.user.id
    );

    return { message: 'Withdrawal marked as completed' };
}

// ── Admin: Reject withdrawal ───────────────────────────────────────────────────
export async function rejectWithdrawal(withdrawalId: string, remarks?: string) {
    const request = await prisma.withdrawalRequest.findUnique({
        where: { id: withdrawalId },
        include: {
            user: {
                include: {
                    wallets: {
                        where: { type: 'WITHDRAWAL' },
                    },
                },
            },
        },
    });

    if (!request) throw new ApiError(404, 'Withdrawal request not found');
    if (request.status !== 'PENDING') {
        throw new ApiError(400, `Cannot reject a ${request.status} request`);
    }

    const withdrawalWallet = request.user.wallets[0];
    if (!withdrawalWallet) throw new ApiError(404, 'User withdrawal wallet not found');

    // ── Full refund + status update atomically ────────────────────────────────
    await prisma.$transaction(async (tx) => {
        // Update status to REJECTED
        await tx.withdrawalRequest.update({
            where: { id: withdrawalId },
            data: {
                status: 'REJECTED',
                ...(remarks && { remarks }),
            },
        });

        // Credit full amount back to withdrawal wallet
        const updatedWallet = await tx.wallet.update({
            where: { id: withdrawalWallet.id },
            data: { balance: { increment: request.pointsRequested } },
        });

        // Record refund transaction so user sees it in history
        await tx.walletTransaction.create({
            data: {
                userId: request.userId,
                walletId: updatedWallet.id,
                type: 'CREDIT',
                points: request.pointsRequested,
                description: `Withdrawal refund of ₹${request.pointsRequested} (request rejected)`,
                referenceType: 'WITHDRAWAL_REFUND',
                referenceId: withdrawalId,
            },
        });
    });

    return { message: 'Withdrawal rejected and full amount refunded' };
}

// ── Admin: Get bill requests ───────────────────────────────────────────────────
export const getBillRequests = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {
        ...(status && { status }),
        ...((from || to) && {
            createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
        }),
        ...(search && {
            user: {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { id: { contains: search } },
                ],
            },
        }),
    };

    const [billRequests, total, summaryAll] = await Promise.all([
        prisma.billRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { status: 'asc' },   // PENDING first (alphabetically before COMPLETED/REJECTED)
                { createdAt: 'asc' },
            ],
            select: {
                id: true,
                amount: true,
                charge: true,
                totalDebit: true,
                billImageUrl: true,
                description: true,
                category: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        bankDetails: true,
                    },
                },
            },
        }),

        prisma.billRequest.count({ where }),

        prisma.billRequest.groupBy({
            by: ['status'],
            _count: { id: true },
            _sum: { totalDebit: true },
        }),
    ]);

    const summary: Record<string, { count: number; amount: number }> = {
        PENDING: { count: 0, amount: 0 },
        COMPLETED: { count: 0, amount: 0 },
        REJECTED: { count: 0, amount: 0 },
    };
    for (const s of summaryAll) {
        summary[s.status] = {
            count: s._count.id,
            amount: Number(s._sum.totalDebit ?? 0),
        };
    }

    res.status(200).json({
        success: true,
        data: {
            billRequests: billRequests.map(b => ({
                ...b,
                amount: Number(b.amount),
                charge: Number(b.charge),
                totalDebit: Number(b.totalDebit),
            })),
            summary,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        },
    });
};

// ── Admin: Complete bill request ───────────────────────────────────────────────
export async function completeBillRequestController(req: Request, res: Response) {

    const billRequestId = req.params.billRequestId as string;

    if (!billRequestId) throw new ApiError(400, 'Bill request ID is required');

    const result = await completeBillRequest(billRequestId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'Bill request completed successfully'
    })
}

// ── Admin: Reject bill request ─────────────────────────────────────────────────
export async function rejectBillRequestController(req: Request, res: Response) {

    const billRequestId = req.params.billRequestId as string;

    if (!billRequestId) throw new ApiError(400, 'Bill request ID is required');

    const result = await rejectBillRequest(billRequestId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'Bill request rejected successfully'
    })
}

// ── Admin: Complete bill request ───────────────────────────────────────────────
export async function completeBillRequest(billRequestId: string) {
    const { adminId } = await getAdminSystemIds();

    const request = await prisma.billRequest.findUnique({
        where: {
            id: billRequestId
        },
        include: {
            user: {
                select: {
                    id: true,
                    sponsorId: true
                }
            }
        }
    });
    if (!request) throw new ApiError(404, 'Bill request not found');
    if (request.status !== 'PENDING') {
        throw new ApiError(400, `Cannot complete a ${request.status} request`);
    }

    // Mark completed + send 10% charge to admin
    await prisma.billRequest.update({
        where: { id: billRequestId },
        data: { status: 'COMPLETED' },
    });

    await handleCommissionSplit(
        request.charge,
        request.user.sponsorId,
        adminId,
        `Bill commission from user ${request.user.id} (10% of ₹${request.amount})`,
        'USER_COMMISSION',
        request.user.id
    );

    return { message: 'Bill request marked as completed' };
}

// ── Admin: Reject bill request ─────────────────────────────────────────────────
export async function rejectBillRequest(billRequestId: string) {
    const request = await prisma.billRequest.findUnique({
        where: { id: billRequestId },
        include: {
            user: {
                include: {
                    wallets: { where: { type: 'SPEND' } },
                },
            },
        },
    });
    if (!request) throw new ApiError(404, 'Bill request not found');
    if (request.status !== 'PENDING') {
        throw new ApiError(400, `Cannot reject a ${request.status} request`);
    }

    const spendWallet = request.user.wallets[0];
    if (!spendWallet) throw new ApiError(404, 'Spend wallet not found');

    // ── Full refund + status update atomically ────────────────────────────────
    await prisma.$transaction(async (tx) => {
        await tx.billRequest.update({
            where: { id: billRequestId },
            data: { status: 'REJECTED' },
        });

        // Refund full totalDebit back to spend wallet
        const updatedWallet = await tx.wallet.update({
            where: { id: spendWallet.id },
            data: { balance: { increment: request.totalDebit } },
        });

        // Record refund transaction so user sees it in history
        await tx.walletTransaction.create({
            data: {
                userId: request.userId,
                walletId: updatedWallet.id,
                type: 'CREDIT',
                points: request.totalDebit,
                description: `Bill request refund of ₹${request.totalDebit} (request rejected)`,
                referenceType: 'BILL_REFUND',
                referenceId: billRequestId,
            },
        });
    });

    return { message: 'Bill request rejected and full amount refunded' };
}

// -------------------------------AUTOPAY-------------------------------

export const getAutoPays = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {
        ...(status && { status }),
        ...((from || to) && {
            createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
        }),
        ...(search && {
            user: {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { id: { contains: search } },
                ],
            },
        }),
    };

    const [autoPays, total, summaryAll] = await Promise.all([
        prisma.autoPay.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ createdAt: 'desc' }],
            select: {
                id: true,
                beneficiaryName: true,
                bankName: true,
                accountNumber: true,
                ifscCode: true,
                upiId: true,
                amount: true,
                dueDate: true,
                category: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: { id: true, name: true, phone: true },
                },
                executions: {
                    orderBy: { executedAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        amount: true,
                        charge: true,
                        totalDebit: true,
                        status: true,
                        executedAt: true,
                    },
                },
            },
        }),

        prisma.autoPay.count({ where }),

        prisma.autoPay.groupBy({
            by: ['status'],
            _count: { id: true },
        }),
    ]);

    const summary: Record<string, number> = {
        PENDING_APPROVAL: 0,
        ACTIVE: 0,
        PAUSED: 0,
        CANCELLED: 0,
        REJECTED: 0,
    };
    for (const s of summaryAll) {
        summary[s.status] = s._count.id;
    }

    res.status(200).json({
        success: true,
        data: {
            autoPays: autoPays.map(a => ({
                ...a,
                amount: Number(a.amount),
                executions: a.executions.map(e => ({
                    ...e,
                    amount: Number(e.amount),
                    charge: Number(e.charge),
                    totalDebit: Number(e.totalDebit),
                })),
            })),
            summary,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
    });
};

export async function approveAutoPayController(req: Request, res: Response) {
    const { autoPayId } = req.params;
    if (typeof autoPayId !== 'string') {
        throw new ApiError(400, 'Invalid AutoPayId');
    }
    if (!autoPayId) throw new ApiError(400, 'AutoPay ID is required');
    const result = await approveAutoPay(autoPayId);
    res.status(200).json({ success: true, data: result, message: 'AutoPay approved & activated' });
}

export async function rejectAutoPayController(req: Request, res: Response) {
    const { autoPayId } = req.params;

    if (typeof autoPayId !== 'string') {
        throw new ApiError(400, 'Invalid AutoPayId');
    }

    if (!autoPayId) throw new ApiError(400, 'AutoPay ID is required');
    const result = await rejectAutoPay(autoPayId);
    res.status(200).json({ success: true, data: result, message: 'AutoPay rejected' });
}

export async function completeAutoPayExecutionController(req: Request, res: Response) {
    const { executionId } = req.params;

    if (typeof executionId !== 'string') {
        throw new ApiError(400, 'Invalid AutoPayId');
    }

    if (!executionId) throw new ApiError(400, 'Execution ID is required');
    const result = await completeAutoPayExecution(executionId);
    res.status(200).json({ success: true, data: result, message: 'Commission distributed' });
}

export async function rejectAutoPayExecutionController(req: Request, res: Response) {
    const { executionId } = req.params;

    if (typeof executionId !== 'string') {
        throw new ApiError(400, 'Invalid AutoPayId');
    }

    if (!executionId) throw new ApiError(400, 'Execution ID is required');
    const result = await rejectAutoPayExecution(executionId);
    res.status(200).json({ success: true, data: result, message: 'Execution rejected & refunded' });
}

// ── Admin: Approve setup ──────────────────────────────────────────────────────
export async function approveAutoPay(autoPayId: string) {
    const autoPay = await prisma.autoPay.findUnique({ where: { id: autoPayId } });
    if (!autoPay) throw new ApiError(404, 'AutoPay not found');
    if (autoPay.status !== 'PENDING_APPROVAL') {
        throw new ApiError(400, `Cannot approve autopay with status ${autoPay.status}`);
    }
    return prisma.autoPay.update({
        where: { id: autoPayId },
        data: { status: 'ACTIVE' },
    });
}

// ── Admin: Reject setup ───────────────────────────────────────────────────────
export async function rejectAutoPay(autoPayId: string) {
    const autoPay = await prisma.autoPay.findUnique({ where: { id: autoPayId } });
    if (!autoPay) throw new ApiError(404, 'AutoPay not found');
    if (autoPay.status !== 'PENDING_APPROVAL') {
        throw new ApiError(400, `Cannot reject autopay with status ${autoPay.status}`);
    }
    return prisma.autoPay.update({
        where: { id: autoPayId },
        data: { status: 'REJECTED' },
    });
}

// ── Admin: Complete execution ─────────────────────────────────────────────────
export async function completeAutoPayExecution(executionId: string) {
    const { adminId } = await getAdminSystemIds();

    const execution = await prisma.autoPayExecution.findUnique({
        where: { id: executionId },
        include: {
            autoPay: true,
            user: {
                select: {
                    id: true,
                    sponsorId: true
                }
            }
        },
    });
    if (!execution) throw new ApiError(404, 'Execution not found');
    if (execution.status !== 'SUCCESS') {
        throw new ApiError(400, 'Only SUCCESS executions can be completed');
    }

    await handleCommissionSplit(
        execution.charge,
        execution.user.sponsorId,
        adminId,
        `AutoPay commission — ${execution.autoPay.beneficiaryName} (10% of ₹${execution.amount})`,
        'USER_COMMISSION',
        execution.user.id
    );

    await prisma.autoPayExecution.update({
        where: { id: executionId },
        data: { status: 'COMPLETED' }
    });

    return { message: 'AutoPay execution completed' };
}

// ── Admin: Reject execution + refund ─────────────────────────────────────────
export async function rejectAutoPayExecution(executionId: string) {
    const execution = await prisma.autoPayExecution.findUnique({
        where: { id: executionId },
        include: {
            autoPay: true,
            user: {
                include: { wallets: { where: { type: 'SPEND' } } },
            },
        },
    });
    if (!execution) throw new ApiError(404, 'Execution not found');
    if (execution.status !== 'SUCCESS') {
        throw new ApiError(400, 'Only SUCCESS executions can be rejected');
    }

    const spendWallet = execution.user.wallets[0];
    if (!spendWallet) throw new ApiError(404, 'Spend wallet not found');

    await prisma.$transaction(async (tx) => {
        const updatedWallet = await tx.wallet.update({
            where: { id: spendWallet.id },
            data: { balance: { increment: execution.totalDebit } },
        });

        await tx.walletTransaction.create({
            data: {
                userId: execution.userId,
                walletId: updatedWallet.id,
                type: 'CREDIT',
                points: execution.totalDebit,
                description: `AutoPay refund — ${execution.autoPay.beneficiaryName} (₹${execution.totalDebit})`,
                referenceType: 'AUTOPAY_REFUND',
                referenceId: executionId,
            },
        });

        await tx.autoPayExecution.update({
            where: { id: executionId },
            data: { status: 'FAILED' },
        });
    });

    return { message: 'AutoPay execution rejected and amount refunded' };
}

//-------------------IMWALLET-REcharge/BBPs---------------------------------

// ── GET /services ─────────────────────────────────────────────────────────────
export const getServiceTransactions = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const serviceType = (req.query.serviceType as string) || '';
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {
        user: { role: 'USER' },
        ...(serviceType && { serviceType }),
        ...(status && { status }),
        ...((from || to) && {
            createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
        }),
        ...(search && {
            OR: [
                { user: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } },
                { mobileNumber: { contains: search } },
                { orderId: { contains: search } },
                { operatorName: { contains: search, mode: 'insensitive' } },
            ],
        }),
    };

    const [transactions, total, summaryAll] = await Promise.all([
        prisma.serviceTransaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                serviceType: true,
                operatorName: true,
                operatorCode: true,
                amount: true,
                mobileNumber: true,
                orderId: true,
                imwalletTxnId: true,
                operatorTxnId: true,
                status: true,
                commission: true,
                customerName: true,
                dueDate: true,
                billedAmount: true,
                partPayment: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, phone: true },
                },
            },
        }),
        prisma.serviceTransaction.count({ where }),
        prisma.serviceTransaction.groupBy({
            by: ['status'],
            where: { user: { role: 'USER' } },
            _count: { id: true },
            _sum: { commission: true, amount: true },
        }),
    ]);

    const summary = {
        statusCounts: { PENDING: 0, SUCCESS: 0, FAILED: 0, REFUNDED: 0 } as Record<string, number>,
        totalCommission: 0,
        totalAmountPaid: 0,
    };
    for (const s of summaryAll) {
        summary.statusCounts[s.status] = s._count.id;
        if (s.status === 'SUCCESS') {
            summary.totalCommission = Number(s._sum.commission ?? 0);
            summary.totalAmountPaid = Number(s._sum.amount ?? 0);
        }
    }

    res.status(200).json({
        success: true,
        data: {
            transactions: transactions.map(t => ({
                ...t,
                amount: Number(t.amount),
                commission: t.commission ? Number(t.commission) : null,
                billedAmount: t.billedAmount ? Number(t.billedAmount) : null,
            })),
            summary,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
    });
};

// ── GET /services/imwallet-balance ────────────────────────────────────────────
export const getIMWalletBalance = async (_req: Request, res: Response) => {
    const result = await imwalletAPIService.checkBalance();
    res.status(200).json({ success: true, data: result });
};

// ── POST /services/:id/check-status ──────────────────────────────────────────
export const checkServiceStatus = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Invalid transaction id');
    }

    const txn = await prisma.serviceTransaction.findUnique({
        where: { id },
        select: { id: true, serviceType: true, orderId: true, status: true, createdAt: true },
    });
    if (!txn) throw new ApiError(404, 'Service transaction not found');
    if (txn.status !== 'PENDING') throw new ApiError(400, 'Only PENDING transactions can be status-checked');

    const dot = txn.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

    let liveStatus;
    if (txn.serviceType === 'MOBILE_PREPAID') {
        liveStatus = await imwalletAPIService.checkRechargeStatus({ orderId: txn.orderId, dot });
    } else {
        liveStatus = await imwalletAPIService.checkBBPSStatus({ orderid: txn.orderId, dot });
    }

    // Option B — return live result, no DB update (webhook handles that)
    res.status(200).json({ success: true, data: { liveStatus, orderId: txn.orderId } });
};


//----------------------Mobile Prepaid recharge Plans--------------------------------
// ── GET /recharge-plans ───────────────────────────────────────────────────────
export const getRechargePlans = async (_req: Request, res: Response) => {
    const plans = await prisma.rechargePlan.findMany({
        orderBy: [{ operatorCode: 'asc' }, { amount: 'asc' }],
    });
    res.status(200).json({
        success: true,
        data: { plans: plans.map(p => ({ ...p, amount: Number(p.amount) })) },
    });
};

// ── POST /recharge-plans ──────────────────────────────────────────────────────
export const createRechargePlan = async (req: Request, res: Response) => {
    const { operatorCode, category, amount, data, calls, validity } = req.body;
    if (!operatorCode || !category || !amount || !data || !calls || !validity) {
        throw new ApiError(400, 'All fields are required');
    }
    const plan = await prisma.rechargePlan.create({
        data: { operatorCode, category, amount: new Decimal(amount), data, calls, validity },
    });
    res.status(201).json({ success: true, data: { ...plan, amount: Number(plan.amount) }, message: 'Plan created' });
};

// ── PUT /recharge-plans/:id ───────────────────────────────────────────────────
export const updateRechargePlan = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Invalid recharge paln id');
    }

    const { operatorCode, category, amount, data, calls, validity } = req.body;
    const plan = await prisma.rechargePlan.update({
        where: { id },
        data: { operatorCode, category, amount: amount ? new Decimal(amount) : undefined, data, calls, validity },
    });
    res.status(200).json({ success: true, data: { ...plan, amount: Number(plan.amount) }, message: 'Plan updated' });
};

// ── PATCH /recharge-plans/:id/toggle ─────────────────────────────────────────
export const toggleRechargePlan = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Invalid recharge paln id');
    }

    const plan = await prisma.rechargePlan.findUnique({ where: { id } });
    if (!plan) throw new ApiError(404, 'Plan not found');
    const updated = await prisma.rechargePlan.update({
        where: { id },
        data: { isActive: !plan.isActive },
    });
    res.status(200).json({
        success: true,
        data: { ...updated, amount: Number(updated.amount) },
        message: `Plan ${updated.isActive ? 'activated' : 'hidden'}`,
    });
};

// ── DELETE /recharge-plans/:id ────────────────────────────────────────────────
export const deleteRechargePlan = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Invalid recharge paln id');
    }

    await prisma.rechargePlan.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Plan deleted' });
};


//----------------------------------VENDOR-----------------------------------------
export const getVendors = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const approvalStatus = (req.query.approvalStatus as string) || '';
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {
        ...(approvalStatus && { approvalStatus }),
        ...(search && {
            OR: [
                { shopName: { contains: search, mode: 'insensitive' } },
                { ownerName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { id: { contains: search } },
            ],
        }),
    };

    const [vendors, total, summaryAll] = await Promise.all([
        prisma.vendor.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { approvalStatus: 'asc' }, // PENDING first alphabetically
                { createdAt: 'desc' },
            ],
            select: {
                id: true,
                shopName: true,
                ownerName: true,
                phone: true,
                category: true,
                pincode: true,
                approvalStatus: true,
                isActive: true,
                commissionRate: true,
                createdAt: true,
                sponsor: {
                    select: { id: true, name: true, code: true },
                },
            },
        }),
        prisma.vendor.count({ where }),
        prisma.vendor.groupBy({
            by: ['approvalStatus'],
            _count: { id: true },
        }),
    ]);

    const summary: Record<string, number> = {
        PENDING: 0, APPROVED: 0, REJECTED: 0,
    };
    for (const s of summaryAll) {
        summary[s.approvalStatus] = s._count.id;
    }

    res.status(200).json({
        success: true,
        data: {
            vendors: vendors.map(v => ({
                ...v,
                commissionRate: Number(v.commissionRate),
            })),
            summary,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
    });
};

export const getVendorDetail = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Vendor id is required');
    }

    const [vendor, transactions, txnStats] = await Promise.all([
        prisma.vendor.findUnique({
            where: { id },
            include: {
                bankDetails: true,
                wallet: true,
                sponsor: {
                    select: { id: true, name: true, phone: true, code: true },
                },
            },
        }),

        prisma.vendorTransaction.findMany({
            where: { vendorId: id },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                id: true,
                amount: true,
                commissionAmount: true,
                description: true,
                createdAt: true,
                user: {
                    select: { id: true, name: true, phone: true },
                },
            },
        }),

        prisma.vendorTransaction.aggregate({
            where: { vendorId: id },
            _sum: { amount: true, commissionAmount: true },
            _count: { id: true },
        }),
    ]);

    if (!vendor) throw new ApiError(404, 'Vendor not found');

    res.status(200).json({
        success: true,
        data: {
            vendor: {
                ...vendor,
                commissionRate: Number(vendor.commissionRate),
                wallet: vendor.wallet ? {
                    ...vendor.wallet,
                    balance: Number(vendor.wallet.balance),
                    processingBalance: Number(vendor.wallet.processingBalance),
                } : null,
            },
            transactions: transactions.map(t => ({
                ...t,
                amount: Number(t.amount),
                commissionAmount: Number(t.commissionAmount),
            })),
            stats: {
                totalTransactions: txnStats._count.id,
                totalSales: Number(txnStats._sum.amount ?? 0),
                totalCommission: Number(txnStats._sum.commissionAmount ?? 0),
            },
        },
    });
};

export const approveVendor = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Vendor id is required');
    }

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    if (vendor.approvalStatus !== 'PENDING') throw new ApiError(400, `Vendor is already ${vendor.approvalStatus}`);

    await prisma.vendor.update({
        where: { id },
        data: { approvalStatus: 'APPROVED', isActive: true },
    });

    res.status(200).json({ success: true, message: 'Vendor approved and activated' });
};

export const rejectVendor = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Vendor id is required');
    }

    const vendor = await prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    if (vendor.approvalStatus !== 'PENDING') throw new ApiError(400, `Vendor is already ${vendor.approvalStatus}`);

    await prisma.vendor.update({
        where: { id },
        data: {
            approvalStatus: 'REJECTED',
            isActive: false,
            rejectionReason: rejectionReason?.trim() || 'No reason provided',
        },
    });

    res.status(200).json({ success: true, message: 'Vendor rejected' });
};

export const getVendorWithdrawals = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const vendorId = (req.query.vendorId as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {
        ...(vendorId && { vendorId }),
        ...(status && { status }),
        ...((from || to) && {
            createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
            },
        }),
        ...(search && {
            vendor: {
                OR: [
                    { shopName: { contains: search, mode: 'insensitive' } },
                    { ownerName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { id: { contains: search } },
                ],
            },
        }),
    };

    const [withdrawals, total, summaryAll] = await Promise.all([
        prisma.vendorWithdrawalRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
            select: {
                id: true,
                pointsRequested: true,
                status: true,
                transactionRef: true,
                settledAt: true,
                createdAt: true,
                updatedAt: true,
                vendor: {
                    select: {
                        id: true,
                        shopName: true,
                        ownerName: true,
                        phone: true,
                        category: true,
                        bankDetails: true,
                    },
                },
            },
        }),
        prisma.vendorWithdrawalRequest.count({ where }),
        prisma.vendorWithdrawalRequest.groupBy({
            by: ['status'],
            _count: { id: true },
            _sum: { pointsRequested: true },
        }),
    ]);

    const summary: Record<string, { count: number; amount: number }> = {
        PENDING: { count: 0, amount: 0 },
        COMPLETED: { count: 0, amount: 0 },
        REJECTED: { count: 0, amount: 0 },
    };
    for (const s of summaryAll) {
        summary[s.status] = {
            count: s._count.id,
            amount: Number(s._sum.pointsRequested ?? 0),
        };
    }

    res.status(200).json({
        success: true,
        data: {
            withdrawals: withdrawals.map(w => ({
                ...w,
                pointsRequested: Number(w.pointsRequested),
            })),
            summary,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
    });
};

export const completeVendorWithdrawal = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Vendor withdrawal request id is required');
    }

    const { transactionRef } = req.body;

    if (!transactionRef?.trim()) throw new ApiError(400, 'Transaction reference is required');

    const request = await prisma.vendorWithdrawalRequest.findUnique({
        where: { id },
        include: { vendor: { include: { wallet: true } } },
    });
    if (!request) throw new ApiError(404, 'Withdrawal request not found');
    if (request.status !== 'PENDING') throw new ApiError(400, `Cannot complete a ${request.status} request`);

    await prisma.vendorWithdrawalRequest.update({
        where: { id },
        data: {
            status: 'COMPLETED',
            transactionRef: transactionRef.trim(),
            settledAt: new Date(),
        },
    });

    res.status(200).json({ success: true, message: 'Vendor withdrawal marked as completed' });
};

export const rejectVendorWithdrawal = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'Vendor withdrawal request id is required');
    }

    const request = await prisma.vendorWithdrawalRequest.findUnique({
        where: { id },
        include: { vendor: { include: { wallet: true } } },
    });
    if (!request) throw new ApiError(404, 'Withdrawal request not found');
    if (request.status !== 'PENDING') throw new ApiError(400, `Cannot reject a ${request.status} request`);

    const wallet = request.vendor.wallet;
    if (!wallet) throw new ApiError(404, 'Vendor wallet not found');

    await prisma.$transaction([
        prisma.vendorWithdrawalRequest.update({
            where: { id },
            data: { status: 'REJECTED' },
        }),
        prisma.vendorWallet.update({
            where: { id: wallet.id },
            data: {
                balance: { increment: request.pointsRequested },
                processingBalance: { decrement: request.pointsRequested },
            },
        }),
    ]);

    res.status(200).json({ success: true, message: 'Vendor withdrawal rejected and balance refunded' });
};

//------------------------------------Payment-----------------------------------

export const getPayments = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 15;
    const status = (req.query.status as string) || '';
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where: any = {
        ...(status && { status }),
        ...(search && {
            OR: [
                { transactionId: { contains: search } },
                { orderId: { contains: search } },
                {
                    user: {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { phone: { contains: search } },
                        ]
                    }
                },
            ],
        }),
    };

    const [payments, total, summaryAll] = await Promise.all([
        prisma.payment.findMany({
            where, skip, take: limit,
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            select: {
                id: true, amount: true, points: true, status: true,
                orderId: true, transactionId: true, screenshot: true,
                rejectionReason: true, createdAt: true,
                user: { select: { id: true, name: true, phone: true, code: true } },
            },
        }),
        prisma.payment.count({ where }),
        prisma.payment.groupBy({
            by: ['status'],
            _count: { id: true },
            _sum: { amount: true },
        }),
    ]);

    const summary: Record<string, { count: number; amount: number }> = {
        PENDING: { count: 0, amount: 0 }, SUCCESS: { count: 0, amount: 0 },
        FAILED: { count: 0, amount: 0 }, REFUNDED: { count: 0, amount: 0 },
    };
    for (const s of summaryAll) {
        summary[s.status] = { count: s._count.id, amount: Number(s._sum.amount ?? 0) };
    }

    res.status(200).json({
        success: true,
        data: {
            payments: payments.map(p => ({ ...p, amount: Number(p.amount) })),
            summary,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
    });
};

export const approvePayment = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'payment id is required');
    }
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.status !== 'PENDING') throw new ApiError(400, `Cannot approve a ${payment.status} payment`);
    if (!payment.transactionId) throw new ApiError(400, 'No transaction ID submitted yet');

    await prisma.payment.update({
        where: { id },
        data: { status: 'SUCCESS' },
    });

    // Reuse your existing fn — handles activation + points + commission
    await updateUserAccountAfterPayment(payment.userId);

    res.status(200).json({ success: true, message: 'Payment approved and account activated' });
};

export const rejectPayment = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (typeof id !== 'string') {
        throw new ApiError(400, 'payment id is required');
    }
    
    const { rejectionReason } = req.body;

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.status !== 'PENDING') throw new ApiError(400, `Cannot reject a ${payment.status} payment`);

    await prisma.payment.update({
        where: { id },
        data: {
            status: 'FAILED',
            rejectionReason: rejectionReason?.trim() || null,
        },
    });

    res.status(200).json({ success: true, message: 'Payment rejected' });
};
