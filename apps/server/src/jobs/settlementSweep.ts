import { prisma } from "@repo/db";

export const runSettlementSweep = async () => {
    console.log(`[Settlement Sweep] Starting at ${new Date().toISOString()}`);

    // ── Step 1: Find all vendors with balance > 0 and no pending settlement ──
    const eligibleWallets = await prisma.vendorWallet.findMany({
        where: {
            balance: { gt: 0 },
            // ✅ Skip vendors who already have a PENDING request (previous night's not settled yet)
            vendor: {
                vendorwithdrawalRequests: {
                    none: { status: 'PENDING' },
                },
            },
        },
        include: {
            vendor: true,
        },
    });

    if (eligibleWallets.length === 0) {
        console.log('[Settlement Sweep] No eligible vendors found. Exiting.');
        return;
    }

    console.log(`[Settlement Sweep] Found ${eligibleWallets.length} eligible vendors`);

    let successCount = 0;
    let failCount = 0;

    for (const wallet of eligibleWallets) {
        try {
            // ── Step 2: Atomic — lock balance + create withdrawal request ──
            await prisma.$transaction([
                // Move balance → processingBalance
                prisma.vendorWallet.update({
                    where: { id: wallet.id },
                    data: {
                        processingBalance: { increment: wallet.balance },
                        balance: 0,
                    },
                }),
                // Create withdrawal request
                prisma.vendorWithdrawalRequest.create({
                    data: {
                        vendorId: wallet.vendorId,
                        pointsRequested: wallet.balance,
                        status: 'PENDING',
                    },
                }),
            ]);

            successCount++;
            console.log(
                `[Settlement Sweep] ✅ Vendor ${wallet.vendor.shopName} — locked ${wallet.balance} pts`
            );
        } catch (err) {
            failCount++;
            console.error(
                `[Settlement Sweep] ❌ Failed for vendor ${wallet.vendor.shopName}:`,
                err
            );
            // ✅ Continue loop — one failure shouldn't stop others
        }
    }

    console.log(
        `[Settlement Sweep] Done — ✅ ${successCount} success, ❌ ${failCount} failed`
    );
};
