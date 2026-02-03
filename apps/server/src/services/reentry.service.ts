// apps/server/src/services/reentry.service.ts

import { MLM_CONFIG } from '../config/mlm.constants';
import { deductFromWallet } from './wallet.service';
import { findNextAvailablePosition } from './matrix.service';
import { distributeCommission } from './commission.service';
import { prisma } from '@repo/db';

const REENTRY_THRESHOLD = MLM_CONFIG.REENTRY_THRESHOLD;

// Global flag to prevent overlapping cron jobs
let isProcessing = false;

/**
 * Process all pending re-entries in the queue
 * Called by cron job every hour
 */
export async function processReentryQueue() {
  // Prevent overlapping executions
  if (isProcessing) {
    console.log('⚠️  Re-entry job already running, skipping this execution');
    return;
  }

  isProcessing = true;

  try {
    console.log(`\n🔄 [${new Date().toISOString()}] Starting re-entry queue processing...`);

    // Get pending entries (batch of 50)
    const pending = await prisma.reentryQueue.findMany({
      where: { status: 'PENDING' },
      take: 50,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    if (pending.length === 0) {
      console.log('No pending re-entries found\n');
      return;
    }

    console.log(`Found ${pending.length} pending re-entry requests\n`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    // Process each entry
    for (const entry of pending) {
      try {
        const success = await processSingleReentry(entry.id, entry.user.name);
        
        if (success) {
          processed++;
        } else {
          skipped++;
        }
      } catch (error: any) {
        console.error(`❌ Failed to process entry ${entry.id} (${entry.user.name}):`, error.message);
        failed++;
      }
    }

    // Summary
    console.log(`\n📊 Re-entry Queue Processing Summary:`);
    console.log(`   ✅ Processed: ${processed}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   Total: ${pending.length}\n`);

  } finally {
    isProcessing = false;
  }
}

/**
 * Process a single re-entry
 * Returns true if processed, false if skipped
 */
async function processSingleReentry(queueId: string, userName: string): Promise<boolean> {
  console.log(`\n🔄 Processing re-entry for ${userName} (Queue ID: ${queueId})`);

  // Get queue entry
  const entry = await prisma.reentryQueue.findUnique({
    where: { id: queueId },
    select: { userId: true, status: true }
  });

  if (!entry) {
    console.log(`   ❌ Queue entry not found`);
    return false;
  }

  if (entry.status !== 'PENDING') {
    console.log(`   ⚠️  Entry already processed`);
    return false;
  }

  const userId = entry.userId;

  // Process in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Re-check INCENTIVE balance inside transaction
    const wallet = await tx.wallet.findUnique({
      where: {
        userId_type: {
          userId,
          type: 'INCENTIVE',
        },
      },
      select: { balance: true },
    });

    if (!wallet) {
      console.log(`   ❌ INCENTIVE wallet not found`);
      await tx.reentryQueue.update({
        where: { id: queueId },
        data: { status: 'PROCESSED' },
      });
      return false;
    }

    console.log(`INCENTIVE balance: ${wallet.balance.toNumber()} points`);

    // Check if balance is still sufficient
    if (wallet.balance.lt(REENTRY_THRESHOLD)) {
      console.log(`⚠️  Insufficient balance (need ${REENTRY_THRESHOLD}). Skipping.`);
      await tx.reentryQueue.update({
        where: { id: queueId },
        data: { status: 'PROCESSED' },
      });
      return false;
    }

    console.log(`✅ Balance sufficient! Processing re-entry...`);

    // 1. Deduct 163 points from INCENTIVE wallet
    await deductFromWallet(
      userId,
      'INCENTIVE',
      REENTRY_THRESHOLD,
      'Auto re-entry deduction',
      'REENTRY',
      queueId
    );

    // 2. Find next available position in matrix
    const { parentAccountId, matrixPosition } = await findNextAvailablePosition();

    // 3. Create new UserAccount (re-entry)
    const newAccount = await tx.userAccount.create({
      data: {
        userId,
        matrixPosition,
        parentAccountId,
        entryType: 'REENTRY',
      },
      include: {
        parent: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    console.log(
      `   ✅ Re-entry account created at position ${matrixPosition} under ${newAccount.parent?.user.name}`
    );

    // 4. Distribute commission to uplines (155 points)
    // This will automatically add uplines to queue if they hit ≥163
    await distributeCommission(newAccount.id, 'REENTRY');

    // 5. Mark queue entry as processed
    await tx.reentryQueue.update({
      where: { id: queueId },
      data: { status: 'PROCESSED' },
    });

    console.log(`   ✅ Re-entry complete for ${userName}!`);

    return true;
  });

  return result;
}
