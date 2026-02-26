// services/autopay.service.ts

import { Prisma, prisma } from '@repo/db';
import { addToAdminWallet } from './wallet.service';
import { ApiError } from '../utils/ApiError';
import { getAdminSystemIds } from '../utils/system';
import { handleCommissionSplit } from './scanPay.service';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

const CHARGE_RATE = new Decimal(10);

function calcFees(amount: Decimal) {
    const charge = amount.mul(CHARGE_RATE).div(100);
    const totalDebit = amount.add(charge);
    return { charge, totalDebit };
}

// ── User: Create ──────────────────────────────────────────────────────────────
export async function createAutoPay(
    userId: string,
    data: {
        beneficiaryName: string;
        bankName: string;
        accountNumber: string;
        ifscCode: string;
        upiId?: string;
        amount: number;
        dueDate: 'FIVE' | 'TEN' | 'FIFTEEN';
        category: 'RENT' | 'SCHOOL' | 'COLLEGE' | 'EMI' | 'TUITION';
    }
) {
    const amountDecimal = new Decimal(data.amount);
    if (amountDecimal.lte(0)) throw new ApiError(400, 'Amount must be greater than 0');

    // Validate IFSC format
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(data.ifscCode.toUpperCase())) {
        throw new ApiError(400, 'Invalid IFSC code format');
    }

    return prisma.autoPay.create({
        data: {
            userId,
            beneficiaryName: data.beneficiaryName,
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            ifscCode: data.ifscCode.toUpperCase(),
            upiId: data.upiId || null,
            amount: amountDecimal,
            dueDate: data.dueDate,
            category: data.category,
            status: 'PENDING_APPROVAL',
        },
    });
}

// ── User: Get all ─────────────────────────────────────────────────────────────
export async function getUserAutoPays(userId: string) {
    return prisma.autoPay.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
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
            executions: {
                orderBy: { executedAt: 'desc' },
                take: 3,
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
    });
}

// ── User: Pause ───────────────────────────────────────────────────────────────
export async function pauseAutoPay(userId: string, autoPayId: string) {
    const autoPay = await prisma.autoPay.findUnique({ where: { id: autoPayId } });
    if (!autoPay) throw new ApiError(404, 'AutoPay not found');
    if (autoPay.userId !== userId) throw new ApiError(403, 'Unauthorized');
    if (autoPay.status !== 'ACTIVE') {
        throw new ApiError(400, `Cannot pause an autopay with status ${autoPay.status}`);
    }
    return prisma.autoPay.update({
        where: { id: autoPayId },
        data: { status: 'PAUSED' },
    });
}

// ── User: Resume ──────────────────────────────────────────────────────────────
export async function resumeAutoPay(userId: string, autoPayId: string) {
    const autoPay = await prisma.autoPay.findUnique({ where: { id: autoPayId } });
    if (!autoPay) throw new ApiError(404, 'AutoPay not found');
    if (autoPay.userId !== userId) throw new ApiError(403, 'Unauthorized');
    if (autoPay.status !== 'PAUSED') {
        throw new ApiError(400, `Cannot resume an autopay with status ${autoPay.status}`);
    }
    return prisma.autoPay.update({
        where: { id: autoPayId },
        data: { status: 'ACTIVE' },
    });
}

// ── User: Cancel ──────────────────────────────────────────────────────────────
export async function cancelAutoPay(userId: string, autoPayId: string) {
    const autoPay = await prisma.autoPay.findUnique({ where: { id: autoPayId } });
    if (!autoPay) throw new ApiError(404, 'AutoPay not found');
    if (autoPay.userId !== userId) throw new ApiError(403, 'Unauthorized');
    if (autoPay.status === 'CANCELLED') {
        throw new ApiError(400, 'AutoPay is already cancelled');
    }
    return prisma.autoPay.update({
        where: { id: autoPayId },
        data: { status: 'CANCELLED' },
    });
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

// ── CRON: Run for due date ────────────────────────────────────────────────────
export async function runAutoPayCron(dueDate: 'FIVE' | 'TEN' | 'FIFTEEN') {
    const autopays = await prisma.autoPay.findMany({
        where: { status: 'ACTIVE', dueDate },
        include: {
            user: {
                include: { wallets: { where: { type: 'SPEND' } } },
            },
        },
    });

    const results = { processed: 0, successful: 0, insufficient: 0, failed: 0 };

    for (const autoPay of autopays) {
        try {
            const { charge, totalDebit } = calcFees(autoPay.amount);
            const spendWallet = autoPay.user.wallets[0];

            if (!spendWallet || spendWallet.balance.lt(totalDebit)) {
                await prisma.autoPayExecution.create({
                    data: {
                        autoPayId: autoPay.id,
                        userId: autoPay.userId,
                        amount: autoPay.amount,
                        charge,
                        totalDebit,
                        status: 'INSUFFICIENT',
                    },
                });
                results.insufficient++;
            } else {
                await prisma.$transaction(async (tx) => {
                    const updatedWallet = await tx.wallet.update({
                        where: { id: spendWallet.id },
                        data: { balance: { decrement: totalDebit } },
                    });

                    const walletTxn = await tx.walletTransaction.create({
                        data: {
                            userId: autoPay.userId,
                            walletId: updatedWallet.id,
                            type: 'DEBIT',
                            points: totalDebit,
                            description: `AutoPay — ${autoPay.beneficiaryName} (₹${autoPay.amount} + 10% fee ₹${charge})`,
                            referenceType: 'AUTOPAY',
                            referenceId: autoPay.id,
                        },
                    });

                    const execution = await tx.autoPayExecution.create({
                        data: {
                            autoPayId: autoPay.id,
                            userId: autoPay.userId,
                            amount: autoPay.amount,
                            charge,
                            totalDebit,
                            status: 'SUCCESS',
                            walletTransactionId: walletTxn.id,
                        },
                    });

                    await tx.walletTransaction.update({
                        where: { id: walletTxn.id },
                        data: { referenceId: execution.id },
                    });
                });

                results.successful++;
            }
            results.processed++;
        } catch (error) {
            console.error(`AutoPay ${autoPay.id} failed:`, error);
            await prisma.autoPayExecution.create({
                data: {
                    autoPayId: autoPay.id,
                    userId: autoPay.userId,
                    amount: autoPay.amount,
                    charge: new Decimal(0),
                    totalDebit: new Decimal(0),
                    status: 'FAILED',
                },
            });
            results.failed++;
        }
    }

    return results;
}