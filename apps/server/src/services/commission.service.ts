// apps/server/src/services/commission.service.ts

import { EntryType } from '@repo/db';
import { MLM_CONFIG } from '../config/mlm.constants';
import { getUplineChain, getAdminUserId, PrismaTransactionClient } from './matrix.service';
import { distributeTo3Wallets, addToAdminWallet } from './wallet.service';

const COMMISSION_STRUCTURE = MLM_CONFIG.COMMISSION_STRUCTURE;
const UPLINE_DISTRIBUTION = MLM_CONFIG.UPLINE_DISTRIBUTION;

/**
 * Distribute commission to uplines (15 levels) after registration or re-entry
 */
export async function distributeCommission(
  newUserAccountId: string,
  entryType: EntryType,
  tx?: PrismaTransactionClient
) {
  console.log(`\n🎯 Starting commission distribution for account ${newUserAccountId}`);

  // Get upline chain (up to 15 levels)
  const uplineChain = await getUplineChain(newUserAccountId, 15, tx);

  console.log(`Found ${uplineChain.length} uplines in chain`);

  let totalDistributed = 0;

  // Distribute to each upline based on their level
  for (const upline of uplineChain) {
    const levelPoints = COMMISSION_STRUCTURE[upline.level] || 0;

    if (levelPoints === 0) continue;

    if (upline.isAdmin) {
      // Admin found! Give them all remaining points from this level onwards
      let remainingPoints = 0;
      for (let level = upline.level; level <= 15; level++) {
        remainingPoints += COMMISSION_STRUCTURE[level] || 0;
      }

      await addToAdminWallet(
        upline.userId,
        remainingPoints,
        `Commission from ${entryType} (Level ${upline.level} upline + all remaining)`,
        entryType,
        newUserAccountId
      );

      totalDistributed += remainingPoints;

      console.log(
        `✅ ADMIN (Level ${upline.level}): ${remainingPoints} points → WITHDRAWAL wallet (includes Level ${upline.level}-15)`
      );

      // Stop processing - no one above admin
      break;

    } else {
      // Regular user - distribute to 3 wallets (60:30:10)
      await distributeTo3Wallets(
        upline.userId,
        levelPoints,
        `Level ${upline.level} commission from ${entryType}`,
        entryType,
        newUserAccountId
      );

      totalDistributed += levelPoints;

      console.log(
        `✅ Level ${upline.level}: ${levelPoints} points → User ${upline.userId}`
      );
    }
  }

  const TOTAL_DEDUCTED = entryType === 'REENTRY' ? 163 : 199;
  const remainder = TOTAL_DEDUCTED - totalDistributed;

  if (remainder > 0) {
    const adminId = await getAdminUserId();
    await addToAdminWallet(
      adminId,
      remainder,
      `Company profit from ${entryType}`,
      entryType === 'REENTRY' ? 'REENTRY_PROFIT' : 'REGISTRATION_PROFIT',
      newUserAccountId,
    );
    console.log(`✅ Admin profit: ${remainder} pts → WITHDRAWAL wallet (${entryType} remainder)`);
  }

  // Summary
  console.log(`\n📊 Distribution Summary:`);
  console.log(`   Total distributed: ${totalDistributed} / ${UPLINE_DISTRIBUTION} points`);
  console.log(`✅ Commission distribution complete!\n`);
}
