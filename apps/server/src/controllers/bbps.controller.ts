import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { bbpsService } from '../services/bbps.service';
import { imwalletAPIService } from '../services/imwallet-api.service';

export class BBPSController {
  /**
   * GET /api/v1/bbps/operators?category=DTH
   */
  async getOperators(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const category = req.query.category as string;

    if (!category) {
      throw new ApiError(400, 'category is required');
    }

    const operators = await bbpsService.getOperators(category as any);

    return res.json({
      success: true,
      data: operators,
    });
  }

  /**
   * POST /api/v1/bbps/fetch-bill
   * body: { category, account, spkey, operatorName, ad1?, ad2?, ad3? }
   */
  async fetchBill(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const { category, account, spkey, operatorName, ad1, ad2, ad3 } = req.body;

    if (!category || !account || !spkey || !operatorName) {
      throw new ApiError(400, 'Missing required fields');
    }

    const result = await bbpsService.fetchBill({
      userId,
      category,
      account,
      spkey,
      operatorName,
      ad1,
      ad2,
      ad3,
    });

    return res.json(result);
  }

  /**
   * POST /api/v1/bbps/pay-bill
   * body: { category, account, spkey, operatorName, amount, billFetchId?, customerName?, dueDate?, billDate?, billedAmount?, ad1?, ad2?, ad3? }
   */
  async payBill(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new ApiError(401, 'Unauthorized');
    }

    const {
      category,
      account,
      spkey,
      operatorName,
      amount,
      billFetchId,
      customerName,
      dueDate,
      billDate,
      billedAmount,
      ad1,
      ad2,
      ad3,
    } = req.body;

    if (!category || !account || !spkey || !operatorName || !amount) {
      throw new ApiError(400, 'Missing required fields');
    }

    const result = await bbpsService.payBill({
      userId,
      category,
      account,
      spkey,
      operatorName,
      amount: parseFloat(amount),
      billFetchId,
      customerName,
      dueDate,
      billDate,
      billedAmount,
      ad1,
      ad2,
      ad3,
    });

    return res.json(result);
  }
  /**
   * POST /api/v1/bbps/callback
   * body: { status, orderid, imwtid, oprID }
   */
  async handleCallback(req: Request, res: Response) {
  const { status, orderid, imwtid, oprID } = req.body;

  console.log('📞 BBPS Callback received:', req.body);

  if (!status || !orderid) {
    throw new ApiError(400, 'Invalid callback data');
  }

  const result = await bbpsService.handleCallback({
    status,
    orderid,
    imwtid,
    oprID,
  });

  return res.json(result);
}

  async getBBPSExtraParams(req: Request, res: Response) {
  const userId = req.user?.userId;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { spkey } = req.query;

  if (!spkey) {
    throw new ApiError(400, 'spkey is required');
  }

  const spkeyNum = Number(spkey);
  if (Number.isNaN(spkeyNum)) {
    throw new ApiError(400, 'Invalid spkey');
  }

  const result = await imwalletAPIService.getBBPSExtraParams(spkeyNum);

  if (result.status === 'FAILED') {
    throw new ApiError(503, result.msg || 'Failed to fetch operator extra details');
  }

  return res.json(result);

}
}

export const bbpsController = new BBPSController();
