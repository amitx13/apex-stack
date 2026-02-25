export interface BBPSOperator {
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

export interface BillData {
    billFetchId: string;
    billedamount: string;
    dueDate: string;
    billdate: string;
    partPayment: boolean;
    payamount: string;
    acceptPayment: boolean;
    customerName: string;
  };

export interface FetchBillResponse {
  status: 'SUCCESS' | 'FAILED';
  data?: BillData
  msg?: string;
  requestID?: string;
}

export interface PayBillResponse {
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

export interface BBPSStatusResponse {
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