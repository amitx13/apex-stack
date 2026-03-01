// services/withdrawal.service.ts

import { Prisma, prisma } from '@repo/db';
import { ApiError } from '../utils/ApiError';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

const MIN_WITHDRAWAL = new Decimal(100);
const SERVICE_FEE_RATE = new Decimal(6);

export async function requestWithdrawal(userId: string, amount: number) {
    const amountDecimal = new Decimal(amount);

    // ── 1. Validate minimum ───────────────────────────────────────────────────
    if (amountDecimal.lt(MIN_WITHDRAWAL)) {
        throw new ApiError(400, `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);
    }

    // ── 2. Check no existing PENDING request ─────────────────────────────────
    const existingPending = await prisma.withdrawalRequest.findFirst({
        where: { userId, status: 'PENDING' },
    });
    if (existingPending) {
        throw new ApiError(400, 'You already have a pending withdrawal request. Please wait for it to be processed.');
    }

    // ── 3. Check withdrawal wallet balance ────────────────────────────────────
    const withdrawalWallet = await prisma.wallet.findUnique({
        where: { userId_type: { userId, type: 'WITHDRAWAL' } },
    });
    if (!withdrawalWallet) throw new ApiError(404, 'Withdrawal wallet not found');
    if (withdrawalWallet.balance.lt(amountDecimal)) {
        throw new ApiError(400, `Insufficient balance. Available ₹${withdrawalWallet.balance}, requested ₹${amountDecimal}`);
    }

    // ── 4. Pre-calculate fee fields ───────────────────────────────────────────
    const serviceFee = amountDecimal.mul(SERVICE_FEE_RATE).div(100);       // 6%
    const amountToTransfer = amountDecimal.sub(serviceFee);                // 188rs

    // ── 5. Atomic transaction ─────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
        // Debit withdrawal wallet
        const updatedWallet = await tx.wallet.update({
            where: { userId_type: { userId, type: 'WITHDRAWAL' } },
            data: { balance: { decrement: amountDecimal } },
        });

        // Record debit transaction
        await tx.walletTransaction.create({
            data: {
                userId,
                walletId: updatedWallet.id,
                type: 'DEBIT',
                points: amountDecimal,
                description: `Withdrawal request of ₹${amountDecimal} (fee: ₹${serviceFee}, you receive: ₹${amountToTransfer})`,
                referenceType: 'WITHDRAWAL',
                referenceId: userId, // will update to withdrawalRequest.id after creation
            },
        });

        // Create withdrawal request
        await tx.withdrawalRequest.create({
            data: {
                userId,
                pointsRequested: amountDecimal,
                serviceFee,
                amountToTransfer,
                status: 'PENDING',
            },
        });
    });

    return {
        pointsRequested: amountDecimal.toNumber(),
        serviceFee: serviceFee.toNumber(),
        amountToTransfer: amountToTransfer.toNumber(),
    };
}

// ── User: Get withdrawal wallet + history ──────────────────────────────────────
export async function getWithdrawalData(userId: string) {
    const [wallet, requests] = await Promise.all([
        prisma.wallet.findUnique({
            where: { userId_type: { userId, type: 'WITHDRAWAL' } },
            select: { balance: true },
        }),
        prisma.withdrawalRequest.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                pointsRequested: true,
                serviceFee: true,
                amountToTransfer: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            },
        }),
    ]);

    return {
        wallet: {
            balance: wallet?.balance ?? new Decimal(0),
        },
        requests,
    };
}
