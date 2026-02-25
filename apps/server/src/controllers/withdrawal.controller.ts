import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { completeWithdrawal, getWithdrawalData, rejectWithdrawal, requestWithdrawal } from '../services/withdrawal.service';


// ── User: Get wallet balance + history ────────────────────────────────────────
export async function getWithdrawalDataController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const result = await getWithdrawalData(userId);

    res.status(200).json({ success: true, data: result });
}

// ── User: Request withdrawal ──────────────────────────────────────────────────
export async function requestWithdrawalController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const { amount } = req.body;
    if (!amount || amount <= 0) throw new ApiError(400, 'Invalid amount');

    const result = await requestWithdrawal(userId, amount);

    res.status(200).json({ success: true, data: result });
}

// ── Admin: Complete withdrawal ────────────────────────────────────────────────
export async function completeWithdrawalController(req: Request, res: Response) {

    const withdrawalId = Array.isArray(req.params.withdrawalId)
        ? req.params.withdrawalId[0]
        : req.params.withdrawalId;

    if (!withdrawalId) throw new ApiError(400, 'Withdrawal ID is required');

    const result = await completeWithdrawal(withdrawalId);

    res.status(200).json({ success: true, data: result });
}

// ── Admin: Reject withdrawal ──────────────────────────────────────────────────
export async function rejectWithdrawalController(req: Request, res: Response) {

    const withdrawalId = Array.isArray(req.params.withdrawalId)
        ? req.params.withdrawalId[0]
        : req.params.withdrawalId;

    if (!withdrawalId) throw new ApiError(400, 'Withdrawal ID is required');

    const result = await rejectWithdrawal(withdrawalId);

    res.status(200).json({ success: true, data: result });
}
