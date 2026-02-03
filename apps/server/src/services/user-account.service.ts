// apps/server/src/services/user-account.service.ts

import { findNextAvailablePosition, getUplineChain } from './matrix.service';
import { createUserWallets } from './wallet.service';
import { distributeCommission } from './commission.service';
import { EntryType, prisma } from '@repo/db';
import { ApiError } from '../utils/ApiError';

/**
 * Create user account in matrix (called after successful payment)
 */
export async function createUserAccountInMatrix(
  userId: string,
  entryType: EntryType
) {
  console.log(`\n📍 Creating ${entryType} account for user ${userId}`);

  // 1. Find next available position
  const { parentAccountId, matrixPosition } = await findNextAvailablePosition();

  // 2. Create UserAccount
  const newAccount = await prisma.userAccount.create({
    data: {
      userId,
      matrixPosition,
      parentAccountId,
      entryType,
    },
    include: {
      parent: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  console.log(
    `✅ Account created at position ${matrixPosition} under ${newAccount.parent?.user.name || 'Admin'}`
  );

  // 3. Create wallets if first account (REGISTRATION)
  if (entryType === 'REGISTRATION') {
    const existingWallets = await prisma.wallet.findFirst({
      where: { userId },
    });

    if (!existingWallets) {
      await createUserWallets(userId);
    }
  }

  return newAccount;
}

/**
 * Main function called after payment success
 * This is what you'll call from payment.service.ts
 */
export async function updateUserAccountAfterPayment(userId: string) {
  console.log(`\n🚀 Processing payment for user ${userId}\n`);

  await prisma.$transaction(async (tx) => {

    const userStatus = await tx.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        isRegistrationPayment: true
      }
    });

    if (!userStatus) {
      throw new ApiError(404, `User ${userId} not found`);
    }

    // ✅ Early exit if already processed (inside transaction = safe!)
    if (userStatus.isActive && userStatus.isRegistrationPayment) {
      console.log(`⚠️  User ${userId} already activated. Skipping.`);
      return;
    }

    // 1. Update user status
    await tx.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        isRegistrationPayment: true,
      },
    });

    console.log(`✅ User ${userId} activated`);

    // 2. Create account in matrix
    const userAccount = await createUserAccountInMatrix(userId, 'REGISTRATION');

    // 3. Distribute commission to uplines
    await distributeCommission(userAccount.id, 'REGISTRATION');
  });
}