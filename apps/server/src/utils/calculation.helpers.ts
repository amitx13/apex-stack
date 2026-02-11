// apps/server/src/utils/calculation.helpers.ts

import { Prisma } from "@repo/db";

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

/**
 * Split points into 3 wallets: SPEND (60%), INCENTIVE (30%), WITHDRAWAL (10%)
 */
export function splitPointsToWallets(totalPoints: number | Decimal) {
  const points = typeof totalPoints === 'number' ? totalPoints : totalPoints.toNumber();

  const spend = new Decimal(points).mul(0.6);
  const incentive = new Decimal(points).mul(0.3);
  const withdrawal = new Decimal(points).mul(0.1);

  // Verify total (handle floating point precision)
  const total = spend.plus(incentive).plus(withdrawal);
  const diff = new Decimal(points).minus(total);

  // Add any remainder to SPEND wallet
  const finalSpend = spend.plus(diff);

  return {
    SPEND: finalSpend,
    INCENTIVE: incentive,
    WITHDRAWAL: withdrawal,
  };
}

/**
 * Calculate remaining points to give to admin
 */
export function calculateRemainingPoints(
  totalDistributable: number,
  uplineLevelsCount: number,
  commissionStructure: Record<number, number>
): number {
  let distributed = 0;

  for (let level = 1; level <= uplineLevelsCount; level++) {
    distributed += commissionStructure[level] || 0;
  }

  return totalDistributable - distributed;
}
