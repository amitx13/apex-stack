// services/scanPay.service.ts

import { Prisma, prisma, ReferenceType } from "@repo/db";

import { distributeTo3Wallets, addToAdminWallet } from "./wallet.service";
import { getAdminSystemIds } from "../utils/system";
import { ApiError } from "../utils/ApiError";


type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

const USER_COMMISSION_RATE = new Decimal(10);

export async function handleCommissionSplit(
  commission: Decimal,
  sponsorId: string | null,
  adminId: string,
  description: string,
  referenceType: ReferenceType,
  referenceId: string
) {
  // If no sponsor OR sponsor is admin → 100% to admin
  if (!sponsorId || sponsorId === adminId) {
    await addToAdminWallet(adminId, commission, description, referenceType, referenceId);
    return;
  }

  const adminCut = commission.mul(60).div(100);   // 60% → admin
  const sponsorCut = commission.mul(40).div(100); // 40% → sponsor

  await addToAdminWallet(
    adminId,
    adminCut,
    `${description} (admin 60%)`,
    referenceType,
    referenceId
  );

  await distributeTo3Wallets(
    sponsorId,
    sponsorCut,
    `${description} (sponsor 40%)`,
    referenceType,
    referenceId
  );
}

export async function processScanPay(
  userId: string,
  vendorId: string,
  amount: number
) {
  const amountDecimal = new Decimal(amount);

  // ── 1. Fetch all required data in parallel ──────────────────────────────────
  const [vendor, user, { adminId }] = await Promise.all([
    prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        commissionRate: true,
        sponsorId: true,
        isActive: true,
        wallet: { select: { id: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        sponsorId: true,
      },
    }),
    getAdminSystemIds(),
  ]);

  // ── 2. Guards ───────────────────────────────────────────────────────────────
  if (!vendor) throw new ApiError(404, 'Vendor not found');
  if (!vendor.isActive) throw new ApiError(404, 'Vendor is not active');
  if (!vendor.wallet) throw new ApiError(404, 'Vendor wallet not found');
  if (!user) throw new ApiError(404, 'User not found');

  // ── 3. Calculate commissions ────────────────────────────────────────────────
  const userCommission = amountDecimal.mul(USER_COMMISSION_RATE).div(100);       // always 10%
  const totalDebitFromUser = amountDecimal.add(userCommission);                  // amount + 10%

  const vendorCommissionRate = new Decimal(vendor.commissionRate);
  const vendorCommission = amountDecimal.mul(vendorCommissionRate).div(100);     // 0 if rate = 0
  const vendorReceives = amountDecimal.sub(vendorCommission);                    // amount - vendor%

  // ── 4. All DB operations in one atomic transaction ──────────────────────────
  await prisma.$transaction(async (tx) => {

    // ── 4a. Check user SPEND wallet balance ───────────────────────────────────
    const spendWallet = await tx.wallet.findUnique({
      where: { userId_type: { userId, type: 'SPEND' } },
    });

    if (!spendWallet) throw new ApiError(404, 'User SPEND wallet not found');
    if (spendWallet.balance.lt(totalDebitFromUser)) {
      throw new ApiError(404, `Insufficient balance. Required ₹${totalDebitFromUser}, available ₹${spendWallet.balance}`);
    }

    // ── 4b. Debit user SPEND wallet (amount + 10%) ────────────────────────────
    const updatedSpendWallet = await tx.wallet.update({
      where: { userId_type: { userId, type: 'SPEND' } },
      data: { balance: { decrement: totalDebitFromUser } },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: updatedSpendWallet.id,
        type: 'DEBIT',
        points: totalDebitFromUser,
        description: `Payment to vendor (₹${amount} + 10% service charge ₹${userCommission})`,
        referenceType: 'VENDOR_PAYMENT',
        referenceId: vendorId,
      },
    });

    // ── 4c. Credit vendor wallet (amount - vendor commission%) ────────────────
    await tx.vendorWallet.update({
      where: { vendorId },
      data: { balance: { increment: vendorReceives } },
    });

    // ── 4d. Record VendorTransaction ──────────────────────────────────────────
    const vendorTxn = await tx.vendorTransaction.create({
      data: {
        vendorId,
        userId,
        vendorWalletId: vendor.wallet?.id,
        amount: amountDecimal,
        commissionAmount: vendorCommission,  // vendor's only, 0 if rate = 0
        description: `Payment received from user (₹${amount}${vendorCommission.gt(0)
          ? ` - ${vendorCommissionRate}% commission ₹${vendorCommission}`
          : ', no commission'
        })`,
      },
    });

    // ── 4e. User commission split (outside tx — uses own prisma.$transaction) ─
    // NOTE: we handle after the main tx block below
    return vendorTxn;
  });

  // ── 5. Commission distributions (outside main tx since they open their own) ─

  // User commission → 60% admin, 40% user's sponsor
  await handleCommissionSplit(
    userCommission,
    user.sponsorId,
    adminId,
    `Service charge commission from user ${userId}`,
    'USER_COMMISSION',
    userId
  );

  // Vendor commission → only if > 0
  if (vendorCommission.gt(0)) {
    await handleCommissionSplit(
      vendorCommission,
      vendor.sponsorId,
      adminId,
      `Vendor commission from vendor ${vendorId}`,
      'VENDOR_COMMISSION',
      vendorId
    );
  }

  return {
    amountPaid: totalDebitFromUser.toNumber(),
    vendorCredited: vendorReceives.toNumber(),
    userCommission: userCommission.toNumber(),
    vendorCommission: vendorCommission.toNumber(),
  };
}
