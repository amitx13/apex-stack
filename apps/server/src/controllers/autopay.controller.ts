// controllers/autopay.controller.ts

import { Request, Response } from 'express';
import {
    createAutoPay,
    getUserAutoPays,
    pauseAutoPay,
    resumeAutoPay,
    cancelAutoPay,
} from '../services/autopay.service';
import { ApiError } from '../utils/ApiError';

export async function createAutoPayController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const {
        beneficiaryName,
        bankName,
        accountNumber,
        ifscCode,
        upiId,
        amount,
        dueDate,
        category,
    } = req.body;

    // ✅ upiId is optional — not in required check
    if (!beneficiaryName || !bankName || !accountNumber || !ifscCode || !amount || !dueDate || !category) {
        throw new ApiError(400, 'All fields are required');
    }

    const result = await createAutoPay(userId, {
        beneficiaryName,
        bankName,
        accountNumber,
        ifscCode,
        upiId:  upiId || undefined,
        amount: parseFloat(amount),
        dueDate,
        category,
    });

    res.status(201).json({
        success: true,
        data:    result,
        message: 'AutoPay setup submitted for admin approval',
    });
}


export async function getUserAutoPaysController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const result = await getUserAutoPays(userId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'AutoPays fetched successfully',
    });
}

export async function pauseAutoPayController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const autoPayId = req.params.autoPayId as string;
    if (!autoPayId) throw new ApiError(400, 'AutoPay ID is required');

    const result = await pauseAutoPay(userId, autoPayId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'AutoPay paused',
    });
}

export async function resumeAutoPayController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const autoPayId = req.params.autoPayId as string;
    if (!autoPayId) throw new ApiError(400, 'AutoPay ID is required');

    const result = await resumeAutoPay(userId, autoPayId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'AutoPay resumed',
    });
}

export async function cancelAutoPayController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const autoPayId = req.params.autoPayId as string;
    if (!autoPayId) throw new ApiError(400, 'AutoPay ID is required');

    const result = await cancelAutoPay(userId, autoPayId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'AutoPay cancelled',
    });
}
