// controllers/bill.controller.ts

import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { completeBillRequest, createBillRequest, getUserBillRequests, rejectBillRequest } from '../services/bill.service';
import { deleteUploadedFile } from './vendor.controller';

// ── User: Get all bill requests ────────────────────────────────────────────────
export async function getBillRequestsController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const requests = await getUserBillRequests(userId);

    return res.status(200).json({
        success: true,
        data: requests
    })
}

// ── User: Create bill request ──────────────────────────────────────────────────
export async function createBillRequestController(req: Request, res: Response) {
    const userId = req.user?.userId;
    let uploadedFilePath: string | null = null;

    if (req.file) {
        uploadedFilePath = req.file.path;
    }

    if (!uploadedFilePath) throw new ApiError(400, 'Bill image is required');

    if (!userId) {
        await deleteUploadedFile(uploadedFilePath);
        throw new ApiError(401, 'Unauthorized');
    }

    const { amount, description, category } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        await deleteUploadedFile(uploadedFilePath);

        throw new ApiError(400, 'Valid amount is required');
    }

    const result = await createBillRequest(
        userId,
        parseFloat(amount),
        uploadedFilePath,
        description,
        category,
    );

    res.status(201).json({
        success: true,
        data: result,
        message: 'Bill request created successfully'
    })
}

// ── Admin: Complete bill request ───────────────────────────────────────────────
export async function completeBillRequestController(req: Request, res: Response) {

    const billRequestId = req.params.billRequestId as string;

    if (!billRequestId) throw new ApiError(400, 'Bill request ID is required');

    const result = await completeBillRequest(billRequestId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'Bill request completed successfully'
    })
}

// ── Admin: Reject bill request ─────────────────────────────────────────────────
export async function rejectBillRequestController(req: Request, res: Response) {

    const billRequestId = req.params.billRequestId as string;

    if (!billRequestId) throw new ApiError(400, 'Bill request ID is required');

    const result = await rejectBillRequest(billRequestId);

    res.status(200).json({
        success: true,
        data: result,
        message: 'Bill request rejected successfully'
    })
}
