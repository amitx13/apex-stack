import { prisma } from '@repo/db';
import { imwalletAPIService } from './imwallet-api.service';
import { creditToSpendWallet, deductFromWallet } from './wallet.service';
import { Prisma } from "@repo/db";
import { ApiError } from '../utils/ApiError';

const Decimal = Prisma.Decimal;

class RechargeService {
    /**
     * Generate unique order ID (8-32 characters as per IMWallet requirement)
     */
    private generateOrderId(): string {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        return `RCH${timestamp}${random}`; // Example: RCH1707562345ABC123
    }

    /**
     * Get mobile operators list
     */
    async getMobileOperators() {
        const { imwalletConfig } = await import('../config/imwallet.config');
        return imwalletConfig.mobileOperators;
    }

    /**
     * Process mobile recharge
     */
    async processMobileRecharge(params: {
        userId: string;
        operatorCode: string;
        mobileNumber: string;
        amount: number;
    }) {
        const { userId, operatorCode, mobileNumber, amount } = params;

        // 1. Validate amount
        if (amount < 10 || amount > 50000) {
            throw new ApiError(400, 'Amount must be between ₹10 and ₹50,000');
        }

        // 2. Validate mobile number
        if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
            throw new ApiError(400, 'Invalid mobile number');
        }

        // 3. Get operator details
        const { imwalletConfig } = await import('../config/imwallet.config');
        const operator = imwalletConfig.mobileOperators.find(
            (op) => op.code === operatorCode
        );
        if (!operator) {
            throw new ApiError(400, 'Invalid operator code');
        }

        // 4. Check SPEND wallet balance
        const spendWallet = await prisma.wallet.findFirst({
            where: { userId, type: 'SPEND' },
        });

        if (!spendWallet) {
            throw new ApiError(400, 'SPEND wallet not found');
        }

        if (spendWallet.balance.toNumber() < amount) {
            throw new ApiError(400, 'Insufficient balance in SPEND wallet');
        }

        // 5. Generate order ID
        const orderId = this.generateOrderId();

        // 6. Create transaction record (PENDING status) - NO WALLET DEDUCTION YET
        const transaction = await prisma.serviceTransaction.create({
            data: {
                userId,
                serviceType: 'MOBILE_PREPAID',
                operatorName: operator.name,
                operatorCode: operator.code,
                amount: new Decimal(amount),
                mobileNumber,
                orderId,
                status: 'PENDING',
            },
        });

        let imwalletResponse;

        try {
            // 7. Call IMWallet API (wallet NOT deducted yet)
            const callbackUrl = `${process.env.BACKEND_URL}/api/v1/recharge/callback`;

            imwalletResponse = await imwalletAPIService.processMobileRecharge({
                orderId,
                operatorCode: operator.code,
                mobileNumber,
                amount,
                callbackUrl,
            });

            // 8. Store API response immediately
            await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: {
                    imwalletTxnId: imwalletResponse.requestID,
                    operatorTxnId: imwalletResponse.oprID,
                    commission: imwalletResponse.gross_comm
                        ? new Decimal(imwalletResponse.gross_comm)
                        : null,
                    imwalletResponse: imwalletResponse as any,
                },
            });

        } catch (error: any) {
            await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FAILED',
                    imwalletResponse: { error: error.message } as any,
                },
            });

            throw new ApiError(500, 'Failed to connect to recharge service. Please try again.');
        }

        // 9. Handle IMWallet response status
        const normalizedStatus = imwalletResponse.status.toUpperCase();

        // 🔴 FAILED cases
        if (['FAILED', 'FAIL', 'FAILURE'].includes(normalizedStatus)) {
            await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: { status: 'FAILED' },
            });

            throw new ApiError(
                400,
                `Recharge failed: ${imwalletResponse.msg || 'Unknown error'}`
            );
        }

        if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'PENDING') {

            const result = await prisma.$transaction(async (tx) => {

                const walletTxnId = await deductFromWallet(
                    userId,
                    'SPEND',
                    new Decimal(amount),
                    `Mobile recharge (${normalizedStatus}) - ${operator.name} - ${mobileNumber}`,
                    'RECHARGE',
                    transaction.id,
                    tx
                );

                const updatedTransaction = await tx.serviceTransaction.update({
                    where: { id: transaction.id },
                    data: {
                        status: normalizedStatus,
                        walletTransactionId: walletTxnId,
                    },
                });

                return { updatedTransaction };
            });

            return {
                success: true,
                transaction: result.updatedTransaction,
                message: imwalletResponse.msg || (normalizedStatus === 'SUCCESS' ? 'Recharge successful' : 'Recharge is being processed. You will be notified once completed.'),
                status: normalizedStatus,
            };
        }
        // Unknown status
        throw new ApiError(500, `Unexpected status from recharge service: ${imwalletResponse.status}`);
    }

    /**
     * Handle callback from IMWallet (for PENDING transactions)
     */
    async handleCallback(callbackData: {
        oprTID: string;
        orderid: string;
        account: string;
        amount: string;
        skey: string;
        status: string;
    }) {
        const { orderid, status, oprTID } = callbackData;
        const normalizedStatus = status.toUpperCase();

        // Find transaction
        const transaction = await prisma.serviceTransaction.findUnique({
            where: { orderId: orderid },
        });

        if (!transaction) {
            console.error('❌ Callback for unknown order:', orderid);
            return { success: false, message: 'Order not found' };
        }

        // Only process if currently PENDING
        if (transaction.status !== 'PENDING') {
            console.log('⚠️ Callback for non-pending transaction:', {
                orderId: orderid,
                currentStatus: transaction.status,
                callbackStatus: status,
            });
            return { success: true, message: 'Already processed' };
        }

        // 🟢 SUCCESS
        if (normalizedStatus === 'SUCCESS') {
            // Wallet already deducted when status was PENDING
            await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'SUCCESS',
                    operatorTxnId: oprTID,
                },
            });

            return { success: true, message: 'Transaction marked as success' };
        }

        // 🔴 FAILED
        if (['FAILED', 'FAIL', 'FAILURE'].includes(normalizedStatus)) {
            // Refund the deducted amount
            if (transaction.walletTransactionId) {
                await creditToSpendWallet(
                    transaction.userId,
                    'SPEND',
                    transaction.amount,
                    `Refund - Recharge failed (${status})`,
                    'RECHARGE_REFUND',
                    transaction.id
                );
            }

            await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: { status: 'FAILED' },
            });

            return { success: true, message: 'Transaction failed and refunded' };
        }

        return { success: false, message: 'Unknown status' };
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory(userId: string) {
        return prisma.serviceTransaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get single transaction
     */
    async getTransaction(orderId: string) {
        return prisma.serviceTransaction.findUnique({
            where: { orderId },
        });
    }
}

export const rechargeService = new RechargeService();
