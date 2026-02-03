import { prisma } from '@repo/db';
import { PaymentStatus } from '@repo/db';
import PaytmChecksum from 'paytmchecksum';
import axios from 'axios';
import { PaytmConfig } from '../config/paytm.config.js';
import { ApiError } from '../utils/ApiError.js';
import { updateUserAccountAfterPayment } from './user-account.service.js';

class PaymentService {
  private generateOrderId(): string {
    return 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  async initiateRegistrationPayment(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        isGasConsumerVerified: true,
        isRegistrationPayment: true,
      }
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // if (!user.isGasConsumerVerified) {
    //   throw new ApiError(403, 'Gas consumer number not verified');
    // }

    if (user.isRegistrationPayment) {
      throw new ApiError(400, 'Registration payment already completed');
    }

    const orderId = this.generateOrderId();
    const amount = '199.00';

    const payment = await prisma.payment.create({
      data: {
        userId,
        amount: 199,
        points: 199,
        type: 'REGISTRATION',
        status: 'PENDING',
        orderId,
      }
    });

    const paytmParamsBody = {
      requestType: "Payment",
      mid: PaytmConfig.MID,
      websiteName: PaytmConfig.WEBSITE,
      orderId: orderId,
      channelId: "WAP",
      callbackUrl: `${PaytmConfig.CALLBACK_URL}`,
      txnAmount: {
        value: amount,
        currency: "INR",
      },
      userInfo: {
        custId: userId,
        mobile: user.phone,
      },
      enablePaymentMode: [
        { mode: "UPI", channels: ["UPIPUSH", "UPICOLLECT"] }, // UPI apps
        { mode: "BALANCE" }, // Paytm wallet
        { mode: "CARD" }, // Cards
        { mode: "NB" } // Net banking
      ]
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParamsBody),
      PaytmConfig.MERCHANT_KEY
    );

    const paytmParams = {
      body: paytmParamsBody,
      head: { signature: checksum },
    };

    try {
      const response = await axios.post(
        `${PaytmConfig.INITIATE_TXN_URL}?mid=${PaytmConfig.MID}&orderId=${orderId}`,
        paytmParams,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.data?.body?.txnToken) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' }
        });
        throw new ApiError(500, 'Failed to get transaction token from Paytm');
      }

      return {
        orderId,
        txnToken: response.data.body.txnToken,
        amount,
        mid: PaytmConfig.MID,
        callbackUrl: PaytmConfig.CALLBACK_URL
      };

    } catch (error: any) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' }
      });

      throw new ApiError(500, `Paytm API error: ${error.message}`);
    }
  }

  // ✅ Add checksum verification for callbacks
  async handleCallback(paytmResponse: any) {
    const { ORDERID, TXNID, STATUS, CHECKSUMHASH, ...otherParams } = paytmResponse;

    // Verify checksum
    const isValidChecksum = await PaytmChecksum.verifySignature(
      paytmResponse,
      PaytmConfig.MERCHANT_KEY,
      CHECKSUMHASH
    );

    if (!isValidChecksum) {
      throw new ApiError(400, 'Invalid checksum - possible tampering detected');
    }

    const payment = await prisma.payment.findUnique({
      where: { orderId: ORDERID }
    });

    if (!payment) {
      throw new ApiError(404, 'Payment record not found');
    }

    // // ✅ Idempotency check
    if (payment.status !== 'PENDING') {
      return { message: 'Payment already processed', status: payment.status };
    }

    const paymentStatus: PaymentStatus =
      STATUS === 'TXN_SUCCESS' ? 'SUCCESS' : 'FAILED';

    // Update payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        transactionId: TXNID,
        paytmResponse: paytmResponse,
      }
    });

    // ✅ Update user registration status
    if (paymentStatus === 'SUCCESS') {
      await updateUserAccountAfterPayment(payment.userId);
    }

    return {
      status: paymentStatus,
    };
  }

  async verifyPayment(orderId: string) {
    const paytmParamsBody = {
      mid: PaytmConfig.MID,
      orderId: orderId,
    };

    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParamsBody),
      PaytmConfig.MERCHANT_KEY
    );

    try {
      const response = await axios.post(
        PaytmConfig.TXN_STATUS_URL,
        { body: paytmParamsBody, head: { signature: checksum } },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const result = response.data.body;
      const payment = await prisma.payment.findUnique({
        where: { orderId }
      });

      if (!payment) {
        throw new ApiError(404, 'Payment record not found');
      }

      const status: PaymentStatus =
        result.resultInfo.resultStatus === 'TXN_SUCCESS' ? 'SUCCESS' : 'FAILED';

      // Update payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status,
          transactionId: result.txnId || null,
          paytmResponse: result,
        }
      });

      // Update user if successful
      if (status === 'SUCCESS' && payment.status !== 'SUCCESS') {
        await updateUserAccountAfterPayment(payment.userId);
      }

      return {
        orderId,
        status,
        txnId: result.txnId,
        amount: result.txnAmount,
        message: result.resultInfo.resultMsg,
      };

    } catch (error: any) {
      throw error instanceof ApiError ? error : new ApiError(500, `Payment verification failed: ${error.message}`);
    }
  }
}

export const paymentService = new PaymentService();
