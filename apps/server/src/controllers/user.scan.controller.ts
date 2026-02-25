import type { Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { processScanPay } from "../services/scanPay.service.js";

export async function scanPayController(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) throw new ApiError(401, 'Unauthorized');

    const { vendorId, amount } = req.body;
    if (!vendorId) throw new ApiError(400, 'Vendor ID is required');
    if (!amount || amount <= 0) throw new ApiError(400, 'Invalid amount');

    const result = await processScanPay(userId, vendorId, amount);

    res.status(200).json({
        success: true,
        message: 'Payment processed successfully',
        data: result,
    });
}