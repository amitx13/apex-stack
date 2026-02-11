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

        // 6. Create transaction record (PENDING status)
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

        try {
            // 7. Deduct from SPEND wallet
            const walletTxnId = await deductFromWallet(
                userId,
                'SPEND',
                new Decimal(amount),
                `Mobile recharge - ${operator.name} - ${mobileNumber}`,
                'RECHARGE',
                transaction.id
            );

            // 8. Link wallet transaction
            await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: { walletTransactionId: walletTxnId },
            });

            // 9. Call IMWallet API
            const callbackUrl = `${process.env.BACKEND_URL}/api/v1/recharge/callback`;

            const imwalletResponse = await imwalletAPIService.processMobileRecharge({
                orderId,
                operatorCode: operator.code,
                mobileNumber,
                amount,
                callbackUrl,
            });

            // 10. Update transaction based on response
            const updatedTransaction = await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: imwalletResponse.status as any,
                    imwalletTxnId: imwalletResponse.requestID,
                    operatorTxnId: imwalletResponse.oprID,
                    commission: imwalletResponse.gross_comm
                        ? new Decimal(imwalletResponse.gross_comm)
                        : null,
                    imwalletResponse: imwalletResponse as any,
                },
            });

            // 11. If failed immediately, refund wallet
            if (imwalletResponse.status === 'FAILED') {
                await creditToSpendWallet(
                    userId,
                    'SPEND',
                    new Decimal(amount),
                    `Refund - ${imwalletResponse.msg}`,
                    'RECHARGE_REFUND',
                    transaction.id,
                );
            }

            return {
                success: imwalletResponse.status === 'SUCCESS',
                transaction: updatedTransaction,
                message: imwalletResponse.msg,
                status: imwalletResponse.status,
            };
        } catch (error: any) {
            // Refund on any error
            await creditToSpendWallet(
                userId,
                'SPEND',
                new Decimal(amount),
                `Refund - System error`,
                'RECHARGE_REFUND',
                transaction.id,
            );

            await prisma.serviceTransaction.update({
                where: { id: transaction.id },
                data: { status: 'FAILED' },
            });

            if(error?.message){
                console.log("Error during recharge process:", error.message)
            }

            throw new ApiError(500, 'Failed to process recharge. Amount has been refunded.');
        }
    }

    /**
     * Handle callback from IMWallet (for PENDING transactions)
     */
    async handleCallback(params: {
        orderId: string;
        status: string;
        oprTID?: string;
    }) {
        const { orderId, status, oprTID } = params;

        const transaction = await prisma.serviceTransaction.findUnique({
            where: { orderId },
        });

        if (!transaction) {
            throw new ApiError(404, 'Transaction not found');
        }

        // Normalize status (FAIL/FAILURE/FAILED → FAILED)
        let normalizedStatus: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
        if (status === 'SUCCESS') normalizedStatus = 'SUCCESS';
        if (['FAIL', 'FAILURE', 'FAILED'].includes(status.toUpperCase())) {
            normalizedStatus = 'FAILED';
        }

        // Update transaction
        await prisma.serviceTransaction.update({
            where: { id: transaction.id },
            data: {
                status: normalizedStatus,
                operatorTxnId: oprTID,
            },
        });

        // Refund if failed
        if (normalizedStatus === 'FAILED') {
            await creditToSpendWallet(
                transaction.userId,
                'SPEND',
                transaction.amount,
                `Refund - Transaction failed`,
                'RECHARGE_REFUND',
                transaction.id,
            );
        }

        return { success: true };
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
