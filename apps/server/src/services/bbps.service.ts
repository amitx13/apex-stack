/* import { imwalletAPIService } from './imwallet-api.service';
import { deductFromWallet, creditToSpendWallet } from './wallet.service';
import { ApiError } from '../utils/ApiError';
import { prisma, Prisma } from "@repo/db";

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

class DTHService {

  private generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `DTH${timestamp}${random}`.substring(0, 32);
  }


  async getDTHOperators() {
    try {
      const response = await imwalletAPIService.getBBPSOperators('DTH');
      
      if (response.status !== 'SUCCESS' || !response.data) {
        throw new ApiError(500, response.msg || 'Failed to fetch DTH operators');
      }

      return response.data;
    } catch (error: any) {
      throw new ApiError(500, error.message || 'Failed to fetch DTH operators');
    }
  }


  async fetchDTHBill(params: {
    userId: string;
    subscriberId: string;
    spkey: string;
    operatorName: string;
  }) {
    const { userId, subscriberId, spkey } = params;

    // Get user's mobile number
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      throw new ApiError(400, 'User phone number not found');
    }

    try {
      const billResponse = await imwalletAPIService.fetchBBPSBill({
        account: subscriberId,
        spkey,
        cust_mbl: user.phone,
      });

      if (billResponse.status !== 'SUCCESS' || !billResponse.data) {
        throw new ApiError(400, billResponse.msg || 'Failed to fetch bill');
      }

      return {
        success: true,
        bill: {
          billFetchId: billResponse.data.billFetchId,
          customerName: billResponse.data.customerName,
          billedAmount: parseFloat(billResponse.data.billedamount),
          payAmount: parseFloat(billResponse.data.payamount),
          dueDate: billResponse.data.dueDate,
          billDate: billResponse.data.billdate,
          partPayment: billResponse.data.partPayment,
          acceptPayment: billResponse.data.acceptPayment,
        },
      };
    } catch (error: any) {
      throw new ApiError(500, error.message || 'Failed to fetch DTH bill');
    }
  }


  async processDTHRecharge(params: {
    userId: string;
    subscriberId: string;
    spkey: string;
    operatorName: string;
    amount: number;
    billFetchId?: string;
    customerName?: string;
    dueDate?: string;
    billDate?: string;
  }) {
    const { userId, subscriberId, spkey, operatorName, amount, billFetchId } = params;

    // 1. Validate amount
    if (amount < 10 || amount > 50000) {
      throw new ApiError(400, 'Amount must be between ₹10 and ₹50,000');
    }

    // 2. Check SPEND wallet balance
    const spendWallet = await prisma.wallet.findFirst({
      where: { userId, type: 'SPEND' },
    });

    if (!spendWallet) {
      throw new ApiError(400, 'SPEND wallet not found');
    }

    if (spendWallet.balance.toNumber() < amount) {
      throw new ApiError(400, 'Insufficient balance in SPEND wallet');
    }

    // 3. Get user phone
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      throw new ApiError(400, 'User phone number not found');
    }

    // 4. Generate order ID
    const orderId = this.generateOrderId();

    // 5. Create transaction record
    const transaction = await prisma.serviceTransaction.create({
      data: {
        userId,
        serviceType: 'DTH',
        operatorName,
        operatorCode: spkey,
        amount: new Decimal(amount),
        mobileNumber: subscriberId,
        orderId,
        status: 'PENDING',
        // billFetchId: billFetchId || null,
        // customerName: params.customerName || null,
        // dueDate: params.dueDate ? new Date(params.dueDate) : null,
        // billDate: params.billDate ? new Date(params.billDate) : null,
        // billedAmount: amount ? new Decimal(amount) : null,
      },
    });

    let bbpsResponse;

    try {
      // 6. Call BBPS Pay Bill API
      const callbackUrl = `${process.env.BACKEND_URL}/api/v1/bbps/callback`;

      bbpsResponse = await imwalletAPIService.payBBPSBill({
        account: subscriberId,
        spkey,
        amount,
        orderid: orderId,
        billFetchId: billFetchId || 'NA',
        callBack: callbackUrl,
        cust_mbl: user.phone,
      });

      // 7. Store API response
      await prisma.serviceTransaction.update({
        where: { id: transaction.id },
        data: {
          imwalletTxnId: bbpsResponse.imwtid,
          operatorTxnId: bbpsResponse.oprID,
          commission: bbpsResponse.gross_comm
            ? new Decimal(bbpsResponse.gross_comm)
            : null,
          imwalletResponse: bbpsResponse as any,
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

      throw new ApiError(500, 'Failed to connect to payment service. Please try again.');
    }

    // 8. Handle response status
    const normalizedStatus = bbpsResponse.status.toUpperCase();

    // FAILED cases
    if (['FAILED', 'FAIL', 'FAILURE'].includes(normalizedStatus)) {
      await prisma.serviceTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      throw new ApiError(400, `Recharge failed: ${bbpsResponse.msg || 'Unknown error'}`);
    }

    // SUCCESS or PENDING - Deduct wallet
    if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'PENDING') {
      const result = await prisma.$transaction(async (tx) => {
        const walletTxnId = await deductFromWallet(
          userId,
          'SPEND',
          new Decimal(amount),
          `DTH recharge (${normalizedStatus}) - ${operatorName} - ${subscriberId}`,
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
        message:
          bbpsResponse.msg ||
          (normalizedStatus === 'SUCCESS'
            ? 'DTH recharge successful'
            : 'DTH recharge is being processed. You will be notified once completed.'),
        status: normalizedStatus,
      };
    }

    // Unknown status
    throw new ApiError(500, `Unexpected status from payment service: ${bbpsResponse.status}`);
  }

 
  async handleCallback(callbackData: {
    status: string;
    orderid: string;
    imwtid: string;
    oprID: string;
  }) {
    const { orderid, status, oprID } = callbackData;
    const normalizedStatus = status.toUpperCase();

    const transaction = await prisma.serviceTransaction.findUnique({
      where: { orderId: orderid },
    });

    if (!transaction) {
      console.error('❌ Callback for unknown order:', orderid);
      return { success: false, message: 'Order not found' };
    }

    if (transaction.status !== 'PENDING') {
      console.log('⚠️ Callback for non-pending transaction:', {
        orderId: orderid,
        currentStatus: transaction.status,
        callbackStatus: status,
      });
      return { success: true, message: 'Already processed' };
    }

    // SUCCESS
    if (normalizedStatus === 'SUCCESS') {
      await prisma.serviceTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          operatorTxnId: oprID,
        },
      });

      return { success: true, message: 'Transaction marked as success' };
    }

    // FAILED
    if (['FAILED', 'FAIL', 'FAILURE'].includes(normalizedStatus)) {
      if (transaction.walletTransactionId) {
        await creditToSpendWallet(
          transaction.userId,
          'SPEND',
          transaction.amount,
          `Refund - DTH recharge failed (${status})`,
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
}

export const dthService = new DTHService();
 */


// apps/server/src/services/bbps.service.ts

import { prisma, ServiceType } from '@repo/db';
import { ApiError } from '../utils/ApiError';
import { imwalletAPIService } from './imwallet-api.service';
import { Prisma } from "@repo/db";
import { creditToSpendWallet, deductFromWallet } from './wallet.service';

type Decimal = Prisma.Decimal;
const Decimal = Prisma.Decimal;

type BBPSCategory =
  | 'DTH'
  | 'Electricity'
  | 'Gas'
  | 'Water'
  | 'LPG Booking';

interface FetchBillParams {
  userId: string;
  category: BBPSCategory;
  account: string;        // Customer / consumer / subscriber ID
  spkey: string;          // Operator key from getOperator
  operatorName: string;
  ad1?: string;
  ad2?: string;
  ad3?: string;
}

interface PayBillParams {
  userId: string;
  category: BBPSCategory;
  account: string;
  spkey: string;
  operatorName: string;
  amount: number;
  billFetchId?: string;   // "NA" for direct payment
  customerName?: string;
  dueDate?: string;
  billDate?: string;
  billedAmount?: number;
  ad1?: string;
  ad2?: string;
  ad3?: string;
}

class BBPSService {
  private generateOrderId(prefix: string = 'BBPS'): string {
    const ts = Date.now();
    const rand = Math.floor(Math.random() * 10000);
    return `${prefix}${ts}${rand}`.substring(0, 32);
  }

  private mapCategoryToServiceType(category: BBPSCategory): ServiceType {
    switch (category) {
      case 'DTH':
        return 'DTH';
      case 'Electricity':
        return 'ELECTRICITY';
      case 'Gas':
        return 'GAS';
      case 'LPG Booking':
        return 'LPG_Booking';
      case 'Water':
        return 'WATER';
      default:
        // Fallback to MOBILE_PREPAID if you want, or create more enums
        return 'MOBILE_PREPAID';
    }
  }

  /**
   * Generic: Get operators for any BBPS category
   */
  async getOperators(category: BBPSCategory) {
    const response = await imwalletAPIService.getBBPSOperators(category);

    if (response.status !== 'SUCCESS' || !response.data) {
      throw new ApiError(500, response.msg || 'Failed to fetch operators');
    }

    return response.data;
  }

  /**
   * Generic: Fetch bill for any BBPS category
   */
  async fetchBill(params: FetchBillParams) {
    const { userId, category, account, spkey, ad1, ad2, ad3 } = params;

    // Get user's mobile number (cust_mbl)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      throw new ApiError(400, 'User phone number not found');
    }

    const billResponse = await imwalletAPIService.fetchBBPSBill({
      account,
      spkey,
      cust_mbl: user.phone,
      ad1,
      ad2,
      ad3,
    });

    if (billResponse.status !== 'SUCCESS' || !billResponse.data) {
      throw new ApiError(400, billResponse.msg || 'Failed to fetch bill');
    }

    const data = billResponse.data;

    return {
      success: true,
      category,
      bill: {
        billFetchId: data.billFetchId,
        customerName: data.customerName,
        billedAmount: parseFloat(data.billedamount),
        payAmount: parseFloat(data.payamount),
        dueDate: data.dueDate,
        billDate: data.billdate,
        partPayment: data.partPayment,
        acceptPayment: data.acceptPayment,
      },
    };
  }

  /**
   * Generic: Pay bill / recharge for any BBPS category
   */
  async payBill(params: PayBillParams) {
    const {
      userId,
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
    } = params;

    if (amount < 10 || amount > 50000) {
      throw new ApiError(400, 'Amount must be between ₹10 and ₹50,000');
    }

    // Check SPEND wallet
    const spendWallet = await prisma.wallet.findFirst({
      where: { userId, type: 'SPEND' },
    });

    if (!spendWallet) {
      throw new ApiError(400, 'SPEND wallet not found');
    }

    if (spendWallet.balance.toNumber() < amount) {
      throw new ApiError(400, 'Insufficient balance in SPEND wallet');
    }

    // Get user phone for cust_mbl
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true },
    });

    if (!user?.phone) {
      throw new ApiError(400, 'User phone number not found');
    }

    const orderId = this.generateOrderId('BB');

    // Create transaction (PENDING)
    const serviceType = this.mapCategoryToServiceType(category);

    const transaction = await prisma.serviceTransaction.create({
      data: {
        userId,
        serviceType,
        operatorName,
        operatorCode: spkey,
        amount: new Decimal(amount),
        mobileNumber: account,
        orderId,
        status: 'PENDING',
        billFetchId: billFetchId || null,
        customerName: customerName || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        billDate: billDate ? new Date(billDate) : null,
        billedAmount: billedAmount ? new Decimal(billedAmount) : null,
      },
    });

    let bbpsResponse: any;

    try {
      const callbackUrl = `${process.env.BACKEND_URL}/api/v1/bbps/callback`;

      bbpsResponse = await imwalletAPIService.payBBPSBill({
        account,
        spkey,
        amount,
        orderid: orderId,
        billFetchId: billFetchId || 'NA',
        callBack: callbackUrl,
        cust_mbl: user.phone,
        ad1,
        ad2,
        ad3,
      });

      await prisma.serviceTransaction.update({
        where: { id: transaction.id },
        data: {
          imwalletTxnId: bbpsResponse.imwtid,
          operatorTxnId: bbpsResponse.oprID,
          commission: bbpsResponse.gross_comm
            ? new Decimal(bbpsResponse.gross_comm)
            : null,
          imwalletResponse: bbpsResponse as any,
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

      throw new ApiError(500, 'Failed to connect to payment service. Please try again.');
    }

    const normalizedStatus = (bbpsResponse.status || '').toUpperCase();

    if (['FAILED', 'FAIL', 'FAILURE'].includes(normalizedStatus)) {
      await prisma.serviceTransaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      throw new ApiError(400, `Transaction failed: ${bbpsResponse.msg || 'Unknown error'}`);
    }

    if (normalizedStatus === 'SUCCESS' || normalizedStatus === 'PENDING') {
      const result = await prisma.$transaction(async (tx) => {
        const walletTxnId = await deductFromWallet(
          userId,
          'SPEND',
          new Decimal(amount),
          `${category} payment (${normalizedStatus}) - ${operatorName} - ${account}`,
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
        message:
          bbpsResponse.msg ||
          (normalizedStatus === 'SUCCESS'
            ? `${category} payment successful`
            : `${category} payment is being processed. You will be notified once completed.`),
        status: normalizedStatus,
      };
    }

    throw new ApiError(500, `Unexpected status from payment service: ${bbpsResponse.status}`);
  }

  /**
   * Generic BBPS callback handler
   */
  async handleCallback(callbackData: {
    status: string;
    orderid: string;
    imwtid: string;
    oprID: string;
  }) {
    const { orderid, status, oprID } = callbackData;
    const normalizedStatus = (status || '').toUpperCase();

    const transaction = await prisma.serviceTransaction.findUnique({
      where: { orderId: orderid },
    });

    if (!transaction) {
      console.error('❌ BBPS callback for unknown order:', orderid);
      return { success: false, message: 'Order not found' };
    }

    if (transaction.status !== 'PENDING') {
      console.log('⚠️ Callback for non-pending transaction:', {
        orderId: orderid,
        currentStatus: transaction.status,
        callbackStatus: status,
      });
      return { success: true, message: 'Already processed' };
    }

    if (normalizedStatus === 'SUCCESS') {
      await prisma.serviceTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          operatorTxnId: oprID,
        },
      });

      return { success: true, message: 'Transaction marked as success' };
    }

    if (['FAILED', 'FAIL', 'FAILURE'].includes(normalizedStatus)) {
      if (transaction.walletTransactionId) {
        await creditToSpendWallet(
          transaction.userId,
          'SPEND',
          transaction.amount,
          `Refund - ${transaction.serviceType} payment failed (${status})`,
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
}

export const bbpsService = new BBPSService();
