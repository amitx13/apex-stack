import axios, { AxiosInstance } from 'axios';
import { imwalletConfig } from '../config/imwallet.config';
import { ApiError } from '../utils/ApiError';

class IMWalletAPIService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: imwalletConfig.baseUrl,
      timeout: imwalletConfig.timeout,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Check IMWallet balance
   */
  async checkBalance(): Promise<{
    status: 'SUCCESS' | 'FAILED';
    balance?: number;
    requestID?: string;
    msg?: string;
  }> {
    try {
      const response = await this.axiosInstance.get(
        imwalletConfig.endpoints.checkBalance,
        {
          params: {
            webToken: imwalletConfig.webToken,
            userCode: imwalletConfig.userCode,
          },
        }
      );

      return {
        status: response.data.status,
        balance: response.data.Bal,
        requestID: response.data.requestID,
        msg: response.data.msg,
      };
    } catch (error: any) {
      console.error('IMWallet checkBalance error:', error.message);
      throw new ApiError(503, 'IMWallet service unavailable. Please try again later.');
    }
  }

  /**
   * Process mobile recharge
   */
  async processMobileRecharge(params: {
    orderId: string;
    operatorCode: string;
    mobileNumber: string;
    amount: number;
    callbackUrl: string;
  }): Promise<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    msg: string;
    orderId: string;
    requestID?: string;
    oprID?: string;
    amount?: string;
    bal?: number;
    gross_comm?: number;
    account?: string;
  }> {
    try {
      const response = await this.axiosInstance.get(
        imwalletConfig.endpoints.rechargeProcess,
        {
          params: {
            webToken: imwalletConfig.webToken,
            userCode: imwalletConfig.userCode,
            orderid: params.orderId,
            skey: params.operatorCode,
            accountNo: params.mobileNumber,
            amount: params.amount,
            callBack: params.callbackUrl,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('IMWallet recharge error:', error.message);
      throw new ApiError(503, 'Failed to process recharge. Please try again.');
    }
  }

  /**
   * Check recharge status
   */
  async checkRechargeStatus(params: {
    orderId: string;
    dot: string; // Date of transaction (YYYY-MM-DD)
  }): Promise<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | null;
    msg: string;
    orderId?: string;
    requestID?: string;
    oprID?: string;
  }> {
    try {
      const response = await this.axiosInstance.get(
        imwalletConfig.endpoints.rechargeCheckStatus,
        {
          params: {
            webToken: imwalletConfig.webToken,
            userCode: imwalletConfig.userCode,
            orderid: params.orderId,
            dot: params.dot,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('IMWallet status check error:', error.message);
      throw new ApiError(503, 'Failed to check transaction status. Please try again.');
    }
  }
}

export const imwalletAPIService = new IMWalletAPIService();