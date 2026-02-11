export const PaytmConfig = {
  MID:'uIdsEc87240210211376',
  MERCHANT_KEY:'zpdtBKId5h2l@#XN',
  WEBSITE: 'WEBSTAGING',
  CHANNEL_ID: 'WAP',
  
  // Staging URLs
  INITIATE_TXN_URL: 'https://securestage.paytmpayments.com/theia/api/v1/initiateTransaction',
  TXN_STATUS_URL: 'https://securestage.paytmpayments.com/v3/order/status',
  CALLBACK_URL: process.env.CALLBACK_URL,
};