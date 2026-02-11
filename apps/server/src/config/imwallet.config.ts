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
    { code: 'AT', name: 'Airtel', service: 'Prepaid' },
    { code: 'VI', name: 'Vi', service: 'Prepaid' },
    { code: 'RJ', name: 'Reliance Jio', service: 'Prepaid' },
    { code: 'BT', name: 'BSNL Talktime', service: 'Prepaid' },
    { code: 'BS', name: 'BSNL Special', service: 'Prepaid' },
  ],
  
  // DTH operators (for later)
  dthOperators: [
    { code: 'AD', name: 'Airtel Digital TV', service: 'DTH' },
    { code: 'DT', name: 'Dish TV', service: 'DTH' },
    { code: 'VD', name: 'Videocon D2H', service: 'DTH' },
    { code: 'TS', name: 'Tata Play (Tata Sky)', service: 'DTH' },
    { code: 'SD', name: 'Sun Direct', service: 'DTH' },
  ],
  
  // Request timeout
  timeout: 30000, // 30 seconds
};

// Validation
if (!imwalletConfig.userCode || !imwalletConfig.webToken) {
  console.warn('⚠️  IMWallet credentials not configured in .env');
}
