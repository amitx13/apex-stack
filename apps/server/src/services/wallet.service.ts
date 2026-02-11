// apps/server/src/services/wallet.service.ts

import { prisma, WalletType } from '@repo/db';
import { splitPointsToWallets } from '../utils/calculation.helpers';
import { MLM_CONFIG } from '../config/mlm.constants';
import { Prisma } from "@repo/db";

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

const REENTRY_THRESHOLD = MLM_CONFIG.REENTRY_THRESHOLD;

/**
 * Create 3 wallets for regular user
 */
export async function createUserWallets(userId: string) {
  await prisma.wallet.createMany({
    data: [
      { userId, type: 'SPEND', balance: 0 },
      { userId, type: 'INCENTIVE', balance: 0 },
      { userId, type: 'WITHDRAWAL', balance: 0 },
    ],
  });

  console.log(`✅ Created 3 wallets for user ${userId}`);
}

/**
 * Create WITHDRAWAL wallet only for admin
 */
export async function createAdminWallet(adminId: string) {
  await prisma.wallet.create({
    data: {
      userId: adminId,
      type: 'WITHDRAWAL',
      balance: 0,
    },
  });

  console.log(`✅ Created WITHDRAWAL wallet for admin ${adminId}`);
}

/**
 * Distribute points to 3 wallets with 60:30:10 ratio
 * Automatically adds user to re-entry queue if INCENTIVE wallet ≥ 163
 */
export async function distributeTo3Wallets(
  userId: string,
  totalPoints: number | Decimal,
  description: string,
  referenceType?: string,
  referenceId?: string
) {
  const split = splitPointsToWallets(totalPoints);

  await prisma.$transaction(async (tx) => {
    // SPEND wallet (60%)
    const spendWallet = await tx.wallet.update({
      where: {
        userId_type: {
          userId,
          type: 'SPEND',
        },
      },
      data: {
        balance: { increment: split.SPEND },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: spendWallet.id,
        type: 'CREDIT',
        points: split.SPEND,
        description: `${description} (SPEND 60%)`,
        referenceType,
        referenceId,
      },
    });

    // INCENTIVE wallet (30%)
    const incentiveWallet = await tx.wallet.update({
      where: {
        userId_type: {
          userId,
          type: 'INCENTIVE',
        },
      },
      data: {
        balance: { increment: split.INCENTIVE },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: incentiveWallet.id,
        type: 'CREDIT',
        points: split.INCENTIVE,
        description: `${description} (INCENTIVE 30%)`,
        referenceType,
        referenceId,
      },
    });

    // ✅ CHECK IF INCENTIVE WALLET HIT RE-ENTRY THRESHOLD
    if (incentiveWallet.balance.gte(REENTRY_THRESHOLD)) {
      console.log(`   🔔 User ${userId} hit ${incentiveWallet.balance.toNumber()} points - adding to re-entry queue`);

      try {
        // Try to create queue entry
        await tx.reentryQueue.create({
          data: {
            userId,
            status: 'PENDING',
          },
        });
      } catch (error: any) {
        if (error?.message) {
          console.log("error is re-entry queue:", error.message)
        }
      }
    }

    // WITHDRAWAL wallet (10%)
    const withdrawalWallet = await tx.wallet.update({
      where: {
        userId_type: {
          userId,
          type: 'WITHDRAWAL',
        },
      },
      data: {
        balance: { increment: split.WITHDRAWAL },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: withdrawalWallet.id,
        type: 'CREDIT',
        points: split.WITHDRAWAL,
        description: `${description} (WITHDRAWAL 10%)`,
        referenceType,
        referenceId,
      },
    });
  });

  console.log(
    `✅ Distributed ${totalPoints} points to user ${userId}:`,
    {
      SPEND: split.SPEND.toNumber(),
      INCENTIVE: split.INCENTIVE.toNumber(),
      WITHDRAWAL: split.WITHDRAWAL.toNumber(),
    }
  );
}

/**
 * Add points to admin's WITHDRAWAL wallet only (100%)
 */
export async function addToAdminWallet(
  adminId: string,
  points: number | Decimal,
  description: string,
  referenceType?: string,
  referenceId?: string
) {
  await prisma.$transaction(async (tx) => {
    const adminWallet = await tx.wallet.update({
      where: {
        userId_type: {
          userId: adminId,
          type: 'WITHDRAWAL',
        },
      },
      data: {
        balance: { increment: points },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId: adminId,
        walletId: adminWallet.id,
        type: 'CREDIT',
        points: new Decimal(points),
        description,
        referenceType,
        referenceId,
      },
    });
  });

  console.log(`✅ Added ${points} points to admin WITHDRAWAL wallet`);
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  userId: string,
  walletType: WalletType
): Promise<Decimal> {
  const wallet = await prisma.wallet.findUnique({
    where: {
      userId_type: {
        userId,
        type: walletType,
      },
    },
    select: { balance: true },
  });

  return wallet?.balance || new Decimal(0);
}

/**
 * Deduct points from wallet
 */
export async function deductFromWallet(
  userId: string,
  walletType: WalletType,
  points: number | Decimal,
  description: string,
  referenceType?: string,
  referenceId?: string
): Promise<string> {
  const trxnId = await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.update({
      where: {
        userId_type: {
          userId,
          type: walletType,
        },
      },
      data: {
        balance: { decrement: points },
      },
    });

    const trxn = await tx.walletTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type: 'DEBIT',
        points: new Decimal(points),
        description,
        referenceType,
        referenceId,
      },
    });
    return trxn.id
  });

  console.log(`✅ Deducted ${points} points from ${walletType} wallet`);
  return trxnId;
}

export const creditToSpendWallet = async (
  userId: string,
  walletType: WalletType,
  points: number | Decimal,
  description: string,
  referenceType?: string,
  referenceId?: string
) => {
  await prisma.$transaction(async (tx) => {
    const spendWallet = await tx.wallet.update({
      where: {
        userId_type: {
          userId,
          type: walletType,
        },
      },
      data: {
        balance: { increment: points },
      },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: spendWallet.id,
        type: 'CREDIT',
        points: new Decimal(points),
        description: `${description} (${walletType} ${points} points)`,
        referenceType,
        referenceId,
      },
    });
  })
}