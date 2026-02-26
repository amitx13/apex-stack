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

export interface FetchBillResponse {
  status: 'SUCCESS' | 'FAILED';
  data?: BillData
  msg?: string;
}

type BBPSCategory =
  | 'DTH'
  | 'Electricity'
  | 'Gas'
  | 'Water'
  | 'LPG Booking';

export interface DisplyBillResponse {
  status: boolean;
  category: BBPSCategory;
  bill: BillData
}

/* 

0|api  | Fetch Bill Response: {
0|api  |   billFetchId: '16347247594928',
0|api  |   billedamount: '892.5',
0|api  |   dueDate: '2026-02-27',
0|api  |   billdate: '25 Feb 2026',
0|api  |   partPayment: false,
0|api  |   payamount: '892.5',
0|api  |   acceptPayment: true,
0|api  |   customerName: 'Rina Devi'
0|api  | }


*/

export interface BillData {
  acceptPayment: boolean;
  billDate: string | null;
  billFetchId: string;
  billedamount: number;
  customerName: string;
  dueDate: string | null;
  partPayment: boolean;
  payamount: number;
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