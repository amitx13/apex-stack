import { Request, Response } from 'express';
import { prisma } from '@repo/db';
import jwt from 'jsonwebtoken';
import { ApiError } from '../../utils/ApiError';
import { LoginSchema } from '@repo/types';
import { deleteUploadedFile } from '../vendor.controller';

export const adminLogin = async (req: Request, res: Response) => {
    const validateData = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
        where: {
            id: validateData.userId
        },
        select: { id: true, password: true, name: true, role: true }
    })

    if (!user) {
        throw new ApiError(422, "User-ID is incorrect. Please re-check and try again.")
    }

    if (user.password !== validateData.password) {
        throw new ApiError(422, "Password is incorrect. Please re-check and try again.")
    }

    if (user.role === 'USER') {
        throw new ApiError(422, "This account has user access and is restricted from logging in.")
    }

    const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { password, role, ...userWithoutPassword } = user;

    res.status(200).json({
        success: true,
        data: userWithoutPassword,
        message: `${user.name} logged in successfully`,
    });
};

export const fetchAdminDetails = async (req: Request, res: Response) => {

    const userId = req.user?.userId;

    if (!userId) {
        throw new ApiError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            code:true,
        }
    });

    if (!user) {
        throw new ApiError(404, "Admin account not found.");
    }

    if (user.role === 'USER') {
        throw new ApiError(403, "Access denied.");
    }

    res.status(200).json({
        success: true,
        data: user,
    });
};

export const getAdminDashboardData = async (req: Request, res: Response) => {

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const today = { gte: todayStart, lte: todayEnd };

    const [
        // ── Members ───────────────────────────────────────
        totalUsers,
        activeUsers,
        totalMatrixNodes,

        // ── Today's Activity ──────────────────────────────
        todaySpend,
        todayServiceCommission,
        todayVendorEarnings,
        todayUserWithdrawalsPaid,
        todayVendorWithdrawalsPaid,

        // ── Platform Commission ───────────────────────────
        totalServiceCommission,

        // ── Withdrawals ───────────────────────────────────
        totalUserWithdrawalsPaid,
        totalVendorWithdrawalsPaid,
        pendingUserWithdrawals,
        pendingVendorWithdrawals,

        // ── Net Income ────────────────────────────────────
        todayAdminWalletCredits,

        // ── Admin Wallet ──────────────────────────────────
        adminWalletBalance,

        // ── Pending Actions ───────────────────────────────
        withdrawalRequests,
        vendorApprovals,
        billRequests,
        reentryQueue,
        autoPayApprovals,
        vendorWithdrawals,

        // ── Raw Recent Transactions ───────────────────────
        rawTransactions,

    ] = await Promise.all([

        // ── Members ───────────────────────────────────────
        prisma.user.count({
            where: { role: 'USER' }
        }),

        prisma.user.count({
            where: { role: 'USER', isActive: true }
        }),

        prisma.userAccount.count(),

        // ── Today's Activity ──────────────────────────────
        prisma.walletTransaction.aggregate({
            _sum: { points: true },
            where: {
                type: 'DEBIT',
                createdAt: today,
                wallet: { type: 'SPEND' }
            }
        }),

        prisma.serviceTransaction.aggregate({
            _sum: { commission: true },
            where: {
                status: 'SUCCESS',
                createdAt: today,
            }
        }),

        prisma.vendorTransaction.aggregate({
            _sum: { commissionAmount: true },
            where: { createdAt: today }
        }),

        prisma.withdrawalRequest.aggregate({
            _sum: { amountToTransfer: true },
            where: {
                status: 'COMPLETED',
                updatedAt: today,
            }
        }),

        prisma.vendorWithdrawalRequest.aggregate({
            _sum: { pointsRequested: true },
            where: {
                status: 'COMPLETED',
                settledAt: today,
            }
        }),

        // ── Platform Commission (all time) ────────────────
        prisma.serviceTransaction.aggregate({
            _sum: { commission: true },
            where: { status: 'SUCCESS' }
        }),

        // ── Withdrawals (all time completed) ─────────────
        prisma.withdrawalRequest.aggregate({
            _sum: { amountToTransfer: true },
            where: { status: 'COMPLETED' }
        }),

        prisma.vendorWithdrawalRequest.aggregate({
            _sum: { pointsRequested: true },
            where: { status: 'COMPLETED' }
        }),

        prisma.withdrawalRequest.aggregate({
            _sum: { amountToTransfer: true },
            where: { status: 'PENDING' },
        }),

        prisma.vendorWithdrawalRequest.aggregate({
            _sum: { pointsRequested: true },
            where: { status: 'PENDING' },
        }),

        // ── Net Income ────────────────────────────────────
        prisma.walletTransaction.aggregate({
            _sum: { points: true },
            where: {
                type: 'CREDIT',
                createdAt: today,
                user: { role: 'ADMIN' }
            }
        }),

        // ── Admin Wallet ──────────────────────────────────
        prisma.wallet.aggregate({
            _sum: { balance: true },
            where: {
                type: 'WITHDRAWAL',
                user: { role: 'ADMIN' }
            }
        }),

        // ── Pending Actions ───────────────────────────────
        prisma.withdrawalRequest.count({
            where: { status: 'PENDING' }
        }),

        prisma.vendor.count({
            where: { approvalStatus: 'PENDING' }
        }),

        prisma.billRequest.count({
            where: { status: 'PENDING' }
        }),

        prisma.reentryQueue.count({
            where: { status: 'PENDING' }
        }),

        prisma.autoPay.count({
            where: { status: 'PENDING_APPROVAL' }
        }),

        prisma.vendorWithdrawalRequest.count({
            where: { status: 'PENDING' }
        }),

        // ── Raw Recent Transactions ───────────────────────
        prisma.walletTransaction.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                type: true,
                points: true,
                referenceType: true,
                referenceId: true,         // ← needed for enrichment
                createdAt: true,
                user: { select: { name: true } },
            }
        }),
    ]);

    // ── Enrich Recent Transactions ─────────────────────────
    const userAccountIds = new Set<string>();

    for (const txn of rawTransactions) {
        if (txn.referenceType === 'REGISTRATION' || txn.referenceType === 'REENTRY' || txn.referenceType === 'REGISTRATION_PROFIT' || txn.referenceType === 'REENTRY_PROFIT') {
            userAccountIds.add(txn.referenceId);
        }
    }

    const userAccounts = userAccountIds.size > 0
        ? await prisma.userAccount.findMany({
            where: { id: { in: [...userAccountIds] } },
            select: {
                id: true,
                user: { select: { id: true, name: true } },
            },
        })
        : [];

    const userAccountMap = new Map(userAccounts.map(ua => [ua.id, ua.user]));

    const recentTransactions = rawTransactions.map(txn => {
        let from: { id: string; name: string } | null = null;

        if (txn.referenceType === 'REGISTRATION' || txn.referenceType === 'REENTRY' || txn.referenceType === 'REGISTRATION_PROFIT' || txn.referenceType === 'REENTRY_PROFIT') {
            const user = userAccountMap.get(txn.referenceId);
            if (user) from = user;
        }

        return {
            id: txn.id,
            type: txn.type,
            points: txn.points,
            referenceType: txn.referenceType,
            createdAt: txn.createdAt,
            user: txn.user,
            from,                          // ← who triggered it
        };
    });

    // ── Net Income Calculation ─────────────────────────────
    const todayAdminCredits = Number(todayAdminWalletCredits._sum.points ?? 0);
    const todayIMWalletCommission = Number(todayServiceCommission._sum.commission ?? 0);
    const todayUserWithdrawals = Number(todayUserWithdrawalsPaid._sum.amountToTransfer ?? 0);
    const todayVendorWithdrawals = Number(todayVendorWithdrawalsPaid._sum.pointsRequested ?? 0);
    const todayNetIncome = (todayAdminCredits + todayIMWalletCommission) - (todayUserWithdrawals + todayVendorWithdrawals);

    res.status(200).json({
        success: true,
        dashboardData: {

            members: {
                total: totalUsers,
                active: activeUsers,
                inactive: totalUsers - activeUsers,
                totalMatrixPositions: totalMatrixNodes,
            },

            today: {
                totalSpend: Number(todaySpend._sum.points ?? 0),
                serviceCommission: todayIMWalletCommission,
                vendorEarnings: Number(todayVendorEarnings._sum.commissionAmount ?? 0),
                userWithdrawalsPaid: todayUserWithdrawals,
                vendorWithdrawalsPaid: todayVendorWithdrawals,
                totalWithdrawalsPaid: todayUserWithdrawals + todayVendorWithdrawals,
            },

            commission: {
                todayServiceCommission: todayIMWalletCommission,
                totalServiceCommission: Number(totalServiceCommission._sum.commission ?? 0),
            },

            withdrawals: {
                todayCompleted: todayUserWithdrawals + todayVendorWithdrawals,
                todayUserCompleted: todayUserWithdrawals,
                todayVendorCompleted: todayVendorWithdrawals,
                totalCompleted: Number(totalUserWithdrawalsPaid._sum.amountToTransfer ?? 0) + Number(totalVendorWithdrawalsPaid._sum.pointsRequested ?? 0),
                totalUserCompleted: Number(totalUserWithdrawalsPaid._sum.amountToTransfer ?? 0),
                totalVendorCompleted: Number(totalVendorWithdrawalsPaid._sum.pointsRequested ?? 0),
                pendingUserCount: withdrawalRequests,
                pendingUserAmount: Number(pendingUserWithdrawals._sum.amountToTransfer ?? 0),
                pendingVendorCount: vendorWithdrawals,
                pendingVendorAmount: Number(pendingVendorWithdrawals._sum.pointsRequested ?? 0),
            },

            netIncome: {
                todayAdminWalletCredits: todayAdminCredits,
                todayServiceCommission: todayIMWalletCommission,
                todayWithdrawalsPaid: todayUserWithdrawals + todayVendorWithdrawals,
                todayNet: todayNetIncome,
                adminWalletBalance: Number(adminWalletBalance._sum.balance ?? 0),
            },

            pendingActions: {
                withdrawalRequests,
                vendorApprovals,
                billRequests,
                reentryQueue,
                autoPayApprovals,
                vendorWithdrawals,
            },

            recentTransactions,
        }
    });
};

//--------------------------------Settings----------------------------------

export const getAdminProfile = async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    if (!adminId) throw new ApiError(401, 'Unauthorized');

    const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: {
            id: true,
            name: true,
            phone: true,
            code: true,
            bankDetails: true,
        },
    });
    if (!admin) throw new ApiError(404, 'Admin not found');

    res.status(200).json({ success: true, data: admin });
};

export const updateAdminProfile = async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    if (!adminId) throw new ApiError(401, 'Unauthorized');
    const { name, phone } = req.body;

    if (!name?.trim() && !phone?.trim()) throw new ApiError(400, 'Nothing to update');

    // Check phone uniqueness if changing
    if (phone) {
        const existing = await prisma.user.findFirst({
            where: { phone, NOT: { id: adminId } },
        });
        if (existing) throw new ApiError(409, 'Phone number already in use');
    }

    const updated = await prisma.user.update({
        where: { id: adminId },
        data: {
            ...(name?.trim() && { name: name.trim() }),
            ...(phone?.trim() && { phone: phone.trim() }),
        },
        select: { id: true, name: true, phone: true, code: true },
    });

    res.status(200).json({ success: true, data: updated, message: 'Profile updated' });
};

export const updateAdminPassword = async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    if (!adminId) throw new ApiError(401, 'Unauthorized');
    const { newPassword } = req.body;

    if (!newPassword?.trim()) throw new ApiError(400, 'New password is required');
    if (newPassword.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

    await prisma.user.update({
        where: { id: adminId },
        data: { password: newPassword },
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
};

export const updateAdminBank = async (req: Request, res: Response) => {
    const adminId = req.user?.userId;
    if (!adminId) throw new ApiError(401, 'Unauthorized');

    let uploadedFilePath: string | null = null;
    if (req.file) uploadedFilePath = req.file.path;

    const { bankName, accountNumber, accountType, ifscCode, upiId, gPay } = req.body;

    if (!bankName || !accountNumber || !ifscCode) {
        if (uploadedFilePath) await deleteUploadedFile(uploadedFilePath);
        throw new ApiError(400, 'Bank name, account number and IFSC are required');
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
        if (uploadedFilePath) await deleteUploadedFile(uploadedFilePath);
        throw new ApiError(400, 'Invalid IFSC code format');
    }

    try {
        // If updating and a new QR is uploaded, delete the old one first
        if (uploadedFilePath) {
            const existing = await prisma.bankDetail.findUnique({
                where: { userId: adminId },
                select: { qrCode: true },
            });
            if (existing?.qrCode) await deleteUploadedFile(existing.qrCode);
        }

        const bank = await prisma.bankDetail.upsert({
            where: { userId: adminId },
            create: {
                userId: adminId,
                bankName,
                accountNumber,
                accountType: accountType || 'SAVINGS',
                ifscCode: ifscCode.toUpperCase(),
                upiId: upiId || null,
                gPay: gPay || null,
                qrCode: uploadedFilePath,
            },
            update: {
                bankName,
                accountNumber,
                accountType: accountType || 'SAVINGS',
                ifscCode: ifscCode.toUpperCase(),
                upiId: upiId || null,
                gPay: gPay || null,
                // Only update qrCode if a new file was uploaded
                ...(uploadedFilePath && { qrCode: uploadedFilePath }),
            },
        });

        res.status(200).json({ success: true, data: bank, message: 'Bank details updated' });
    } catch (err: any) {
        if (uploadedFilePath) await deleteUploadedFile(uploadedFilePath);
        throw new ApiError(500, err.message || 'Failed to update bank details');
    }
};

