import { prisma, Prisma } from '@repo/db';
import { getAdminSystemIds } from '../utils/system';
import { addToAdminWallet } from './wallet.service';
import { deleteUploadedFile } from '../controllers/vendor.controller';
import { ApiError } from '../utils/ApiError';
import { handleCommissionSplit } from './scanPay.service';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;


const CHARGE_RATE = new Decimal(10); // 10%

// ── User: Create bill request ──────────────────────────────────────────────────
export async function createBillRequest(
    userId: string,
    amount: number,
    billImageUrl: string,
    description?: string,
    category?: string,
) {
    const amountDecimal = new Decimal(amount);

    if (amountDecimal.lte(0)) {
        await deleteUploadedFile(billImageUrl);

        throw new ApiError(400, 'Amount must be greater than 0');
    }

    // ── Calculate charges ─────────────────────────────────────────────────────
    const charge = amountDecimal.mul(CHARGE_RATE).div(100);       // 10%
    const totalDebit = amountDecimal.add(charge);                  // amount + charge

    // ── Check spend wallet balance ────────────────────────────────────────────
    const spendWallet = await prisma.wallet.findUnique({
        where: { userId_type: { userId, type: 'SPEND' } },
    });
    if (!spendWallet) {
        await deleteUploadedFile(billImageUrl);
        throw new ApiError(404, 'Spend wallet not found');
    }
    if (spendWallet.balance.lt(totalDebit)) {
        await deleteUploadedFile(billImageUrl);

        throw new ApiError(400,
            `Insufficient balance. Need ₹${totalDebit} (₹${amountDecimal} + 10% charge ₹${charge}), available ₹${spendWallet.balance}`
        );
    }

    // ── Atomic: debit wallet + create bill request ────────────────────────────
    const result = await prisma.$transaction(async (tx) => {
        // Debit spend wallet
        const updatedWallet = await tx.wallet.update({
            where: { userId_type: { userId, type: 'SPEND' } },
            data: { balance: { decrement: totalDebit } },
        });

        // Create wallet transaction first
        const walletTxn = await tx.walletTransaction.create({
            data: {
                userId,
                walletId: updatedWallet.id,
                type: 'DEBIT',
                points: totalDebit,
                description: `Bill request of ₹${amountDecimal} + 10% charge ₹${charge}${description ? ` — ${description}` : ''}`,
                referenceType: 'BILL_REQUEST',
                referenceId: userId, // temp — updated below
            },
        });

        // Create bill request linked to wallet transaction
        const billRequest = await tx.billRequest.create({
            data: {
                userId,
                amount: amountDecimal,
                charge,
                totalDebit,
                billImageUrl,
                description,
                category,
                status: 'PENDING',
                walletTransactionId: walletTxn.id,
            },
        });

        // Update referenceId to billRequest.id now that we have it
        await tx.walletTransaction.update({
            where: { id: walletTxn.id },
            data: { referenceId: billRequest.id },
        });

        return billRequest;
    });

    return result;
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

// ── User: Get all bill requests ────────────────────────────────────────────────
export async function getUserBillRequests(userId: string) {
    const requests = await prisma.billRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
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
        },
    });

    return requests;
}
