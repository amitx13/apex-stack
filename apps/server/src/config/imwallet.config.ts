import { config } from 'dotenv';

config();

export const imwalletConfig = {
  userCode: process.env.IMWALLET_USER_CODE || '',
  webToken: process.env.IMWALLET_WEB_TOKEN || '',
  baseUrl: 'https://partner.imwallet.in/web_services',

  endpoints: {
    // Balance check
    checkBalance: '/checkBal.jsp',

    // Recharge APIs
    rechargeProcess: '/recharge_process.jsp',
    rechargeCheckStatus: '/recharge_checkStatus.jsp',

    // BBPS APIs (for later)
    bbpsGetOperator: '/BBPS/getOperator.jsp',
    bbpsFetchBill: '/BBPS/fetchBill.jsp',
    bbpsPayBill: '/BBPS/payBill.jsp',
    bbpsCheckStatus: '/checkStatus.jsp',
  },

  // Mobile operators (hardcoded - rarely change)
  mobileOperators: [
    { code: 'RJ', name: 'Jio Prepaid', service: 'Prepaid', icons: "jio.png" },
    { code: 'AT', name: 'Airtel Prepaid', service: 'Prepaid', icons: "airtel.png" },
    { code: 'VI', name: 'Vi Prepaid', service: 'Prepaid', icons: "vi.png" },
    { code: 'BT', name: 'BSNL Talktime', service: 'Prepaid', icons: "bsnl.png" },
    { code: 'BS', name: 'BSNL Special', service: 'Prepaid', icons: "bsnl.png" },
  ],

  // DTH operators (for later)
  dthOperators: [
    { code: 'AD', name: 'Airtel Digital TV', service: 'DTH' },
    { code: 'DT', name: 'Dish TV', service: 'DTH' },
    { code: 'VD', name: 'Videocon D2H', service: 'DTH' },
    { code: 'TS', name: 'Tata Play (Tata Sky)', service: 'DTH' },
    { code: 'SD', name: 'Sun Direct', service: 'DTH' },
  ],

  bbpsCategories: {
    ELECTRICITY: 'Electricity',
    GAS: 'Gas',
    WATER: 'Water',
    LPG_BOOKING: 'LPG Booking',
    DTH: 'DTH',

    LANDLINE: 'Landline',
    BROADBAND: 'Broadband',
    PREPAID: 'Prepaid',
    CABLE: 'Cable',
    POSTPAID: 'Postpaid',
    DATACARD: 'Datacard Prepaid',
    INSURANCE: 'Insurance',
    EMI: 'EMI Payments',
    CHALLAN: 'Traffic Challan',
    FASTAG: 'Fastag',
    HOSPITAL: 'Hospital',
    DIGITAL_VOUCHER: 'Digital Voucher',
    MUNICIPAL_TAX: 'Municipality Tax',
  },

  // Request timeout
  timeout: 30000, // 30 seconds
};

// Validation
if (!imwalletConfig.userCode || !imwalletConfig.webToken) {
  console.warn('⚠️  IMWallet credentials not configured in .env');
}
