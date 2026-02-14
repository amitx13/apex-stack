import { Request, Response } from 'express';
import { rechargeService } from '../services/recharge.service';
import { ApiError } from '../utils/ApiError';

class RechargeController {
    /**
     * GET /api/v1/recharge/operators/mobile
     * Get list of mobile operators
     */
    async getMobileOperators(req: Request, res: Response) {
        const operators = await rechargeService.getMobileOperators();

        if (!operators || operators.length === 0) {
            throw new ApiError(404, 'No mobile operators found');
        }

        res.json({
            success: true,
            data: operators,
        });
    }

    /**
     * POST /api/v1/recharge/mobile
     * Process mobile recharge
     */
    async processMobileRecharge(req: Request, res: Response) {
        const { operatorCode, mobileNumber, amount } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            throw new ApiError(401, 'Unauthorized');
        }

        if (!operatorCode || !mobileNumber || !amount) {
            throw new ApiError(400, 'Missing required fields: operatorCode, mobileNumber, amount');
        }

        const result = await rechargeService.processMobileRecharge({
            userId,
            operatorCode,
            mobileNumber,
            amount: parseFloat(amount),
        });

        res.json({
            success: result.success,
            message: result.message,
            data: {
                orderId: result.transaction.orderId,
                status: result.transaction.status,
                amount: result.transaction.amount,
                mobileNumber: result.transaction.mobileNumber,
                operator: result.transaction.operatorName,
            },
        });
    }

    /**
     * POST /api/v1/recharge/callback
     * Handle callback from IMWallet
     */
    async handleCallback(req: Request, res: Response) {
        const { orderid, status, oprTID, amount, skey, account } = req.query;

        if (!orderid || !status) {
            throw new ApiError(400, 'Missing parameters: orderid or status');
        }

        await rechargeService.handleCallback({
            oprTID : oprTID as string,
            orderid: orderid as string,
            status: status as string,
            amount: amount as string,
            skey: skey as string,
            account: account as string,
        });

        res.send('OK');
    }

    /**
     * GET /api/v1/recharge/history
     * Get transaction history
     */
    async getHistory(req: Request, res: Response) {
        const userId = req.user?.userId;

        if (!userId) {
            throw new ApiError(401, 'Unauthorized');
        }

        const transactions = await rechargeService.getTransactionHistory(userId);

        res.json({
            success: true,
            data: transactions,
        });
    }

    /**
     * GET /api/v1/recharge/transaction/:orderId
     * Get single transaction details
     */
    async getTransaction(req: Request, res: Response) {
        const { orderId } = req.params as { orderId: string };
        const userId = req.user?.userId;

        if (!userId) {
            throw new ApiError(401, 'Unauthorized');
        }

        const transaction = await rechargeService.getTransaction(orderId);

        if (!transaction) {
            throw new ApiError(404, 'Transaction not found');
        }

        // Verify transaction belongs to user
        if (transaction.userId !== userId) {
            throw new ApiError(403, 'Unauthorized access');
        }

        res.json({
            success: true,
            data: transaction,
        });
    }
}

export const rechargeController = new RechargeController();
