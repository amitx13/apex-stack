import axios, { AxiosInstance } from 'axios';
import { imwalletConfig } from '../config/imwallet.config';
import { ApiError } from '../utils/ApiError';

interface BBPSOperator {
  spkey: string;
  operator: string;
  service: string;
  state: string;
  getBill: 'Required' | 'Not Required';
  name: string;
  bbps_status: string;
  ad1: string;
  ad2: string;
  ad3: string;
  P2P_P2A: 'P2P' | 'P2A';
}

interface FetchBillResponse {
  status: 'SUCCESS' | 'FAILED';
  data?: {
    billFetchId: string;
    billedamount: string;
    dueDate: string;
    billdate: string;
    partPayment: boolean;
    payamount: string;
    acceptPayment: boolean;
    customerName: string;
  };
  msg?: string;
  requestID?: string;
}

interface PayBillResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'FAIL' | 'FAILURE';
  msg: string;
  orderid: string;
  imwtid?: string;
  oprID?: string;
  amount?: string;
  bal?: number;
  gross_comm?: number;
  account?: string;
  opr_type?: 'P2A' | 'P2P';
}

interface BBPSStatusResponse {
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | null;
  msg: string;
  data?: {
    serivce: string;
    amount: string;
    imwtid: string;
    oper_tid: string;
    operator: string;
    account: string;
  };
  requestID?: string;
}

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
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'FAIL' | 'FAILURE';
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

  
// ==================== BBPS APIs ====================

  /**
   * Get BBPS operators by category
   */
  async getBBPSOperators(category: string): Promise<{
    status: 'SUCCESS' | 'FAILED';
    data?: BBPSOperator[];
    msg?: string;
    requestID?: string;
  }> {
    try {
      const payload = {
        webToken: imwalletConfig.webToken,
        userCode: imwalletConfig.userCode,
        parameters: { category },
      };

      const response = await this.axiosInstance.post(
        imwalletConfig.endpoints.bbpsGetOperator,
        `data=${JSON.stringify(payload)}`
      );

      return response.data;
    } catch (error: any) {
      console.error('BBPS getOperators error:', error.message);
      throw new ApiError(503, 'Failed to fetch operators. Please try again.');
    }
  }

  /**
   * Get extra parameters for specific operators (Jharkhand Bijli, Hero FinCorp, HPCL)
   * Allowed spkey: 267, 197, 282
   */
  async getBBPSExtraParams(spkey: string): Promise<{
    status: 'SUCCESS' | 'FAILED';
    data?: any[];
    msg?: string;
  }> {
    try {
      const payload = {
        webToken: imwalletConfig.webToken,
        userCode: imwalletConfig.userCode,
        parameters: { spkey },
      };

      const response = await this.axiosInstance.post(
        '/BBPS/getExtraParam.jsp',
        `data=${JSON.stringify(payload)}`
      );

      return response.data;
    } catch (error: any) {
      console.error('BBPS getExtraParams error:', error.message);
      throw new ApiError(503, 'Failed to fetch extra parameters. Please try again.');
    }
  }

  /**
   * Fetch BBPS bill
   */
  async fetchBBPSBill(params: {
    account: string;
    spkey: string;
    cust_mbl: string;
    ad1?: string;
    ad2?: string;
    ad3?: string;
  }): Promise<FetchBillResponse> {
    try {
      const payload = {
        webToken: imwalletConfig.webToken,
        userCode: imwalletConfig.userCode,
        parameters: {
          account: params.account,
          spkey: params.spkey,
          cust_mbl: params.cust_mbl,
          ad1: params.ad1 || '',
          ad2: params.ad2 || '',
          ad3: params.ad3 || '',
        },
      };

      console.log('📡 Fetching BBPS bill:', { account: params.account, spkey: params.spkey });

      const response = await this.axiosInstance.post(
        imwalletConfig.endpoints.bbpsFetchBill,
        `data=${JSON.stringify(payload)}`
      );

      return response.data;
    } catch (error: any) {
      console.error('BBPS fetchBill error:', error.message);
      throw new ApiError(503, 'Failed to fetch bill. Please try again.');
    }
  }

  /**
   * Pay BBPS bill
   */
  async payBBPSBill(params: {
    account: string;
    spkey: string;
    amount: number;
    orderid: string;
    billFetchId: string;
    callBack: string;
    cust_mbl: string;
    ad1?: string;
    ad2?: string;
    ad3?: string;
  }): Promise<PayBillResponse> {
    try {
      const payload = {
        webToken: imwalletConfig.webToken,
        userCode: imwalletConfig.userCode,
        parameters: {
          account: params.account,
          spkey: params.spkey,
          amount: params.amount.toString(),
          orderid: params.orderid,
          billFetchId: params.billFetchId,
          callBack: params.callBack,
          cust_mbl: params.cust_mbl,
          ad1: params.ad1 || '',
          ad2: params.ad2 || '',
          ad3: params.ad3 || '',
        },
      };

      console.log('📡 Paying BBPS bill:', { orderid: params.orderid, amount: params.amount });

      const response = await this.axiosInstance.post(
        imwalletConfig.endpoints.bbpsPayBill,
        `data=${JSON.stringify(payload)}`
      );

      return response.data;
    } catch (error: any) {
      console.error('BBPS payBill error:', error.message);
      throw new ApiError(503, 'Failed to pay bill. Please try again.');
    }
  }

  /**
   * Check BBPS transaction status
   */
  async checkBBPSStatus(params: {
    orderid: string;
    dot: string; // Date of transaction (YYYY-MM-DD)
  }): Promise<BBPSStatusResponse> {
    try {
      const payload = {
        webToken: imwalletConfig.webToken,
        userCode: imwalletConfig.userCode,
        parameters: {
          orderid: params.orderid,
          dot: params.dot,
        },
      };

      console.log('📡 Checking BBPS status:', { orderid: params.orderid });

      const response = await this.axiosInstance.post(
        imwalletConfig.endpoints.bbpsCheckStatus,
        `data=${JSON.stringify(payload)}`
      );

      return response.data;
    } catch (error: any) {
      console.error('BBPS checkStatus error:', error.message);
      throw new ApiError(503, 'Failed to check transaction status. Please try again.');
    }
  }
}

export const imwalletAPIService = new IMWalletAPIService();