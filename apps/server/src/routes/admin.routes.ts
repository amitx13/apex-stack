import { Router } from 'express';
import { adminLogin, fetchAdminDetails, getAdminDashboardData, getAdminProfile, updateAdminBank, updateAdminPassword, updateAdminProfile } from '../controllers/admin/admin.auth.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { adminAuthMiddleware } from '../middlewares/adminAuth';
import { activateUser, adjustWallet, approveAutoPayController, approvePayment, approveVendor, checkServiceStatus, completeAutoPayExecutionController, completeBillRequestController, completeVendorWithdrawal, createRechargePlan, deleteRechargePlan, getAutoPays, getBillRequests, getIMWalletBalance, getPayments, getRechargePlans, getReentryQueue, getServiceTransactions, getTransactions, getUserAutoPay, getUserBills, getUserDetails, getUsers, getUserTransactions, getUserWithdrawals, getVendorDetail, getVendors, getVendorWithdrawals, getWallets, getWithdrawals, rejectAutoPayController, rejectAutoPayExecutionController, rejectBillRequestController, rejectPayment, rejectVendor, rejectVendorWithdrawal, toggleRechargePlan, updateRechargePlan, updateWithdrawal } from '../controllers/admin/admin.users.controller';
import { processImage, upload } from '../middlewares/upload';
const router = Router();

router.post('/login', asyncHandler(adminLogin))
router.get('/fetchAdminDetails', adminAuthMiddleware, asyncHandler(fetchAdminDetails))
router.get('/getAdminDashboardData', adminAuthMiddleware, asyncHandler(getAdminDashboardData))

router.get('/users', adminAuthMiddleware, asyncHandler(getUsers))
router.get('/users/:userId', adminAuthMiddleware, asyncHandler(getUserDetails))
router.get('/users/:userId/transactions', adminAuthMiddleware, asyncHandler(getUserTransactions))
router.get('/users/:userId/withdrawals', adminAuthMiddleware, asyncHandler(getUserWithdrawals))
router.get('/users/:userId/bills', adminAuthMiddleware, asyncHandler(getUserBills))
router.get('/users/:userId/autopay', adminAuthMiddleware, asyncHandler(getUserAutoPay))
router.post('/users/:userId/activate', adminAuthMiddleware, asyncHandler(activateUser))

router.get("/reentry", adminAuthMiddleware, asyncHandler(getReentryQueue));

router.get('/wallets', adminAuthMiddleware, asyncHandler(getWallets));
router.post('/wallets/:userId/adjust', adminAuthMiddleware, asyncHandler(adjustWallet));
router.get('/transactions', adminAuthMiddleware, asyncHandler(getTransactions));
router.get('/withdrawals', adminAuthMiddleware, asyncHandler(getWithdrawals));
router.patch('/withdrawals/:id', adminAuthMiddleware, asyncHandler(updateWithdrawal));

router.get('/bill-requests', adminAuthMiddleware, asyncHandler(getBillRequests));
router.post('/bill-requests/:billRequestId/complete', adminAuthMiddleware, asyncHandler(completeBillRequestController));
router.post('/bill-requests/:billRequestId/reject', adminAuthMiddleware, asyncHandler(rejectBillRequestController));

router.get('/autopay', adminAuthMiddleware, asyncHandler(getAutoPays));
router.post('/autopay/:autoPayId/approve', adminAuthMiddleware, asyncHandler(approveAutoPayController));
router.post('/autopay/:autoPayId/reject', adminAuthMiddleware, asyncHandler(rejectAutoPayController));
router.post('/autopay/executions/:executionId/complete', adminAuthMiddleware, asyncHandler(completeAutoPayExecutionController));
router.post('/autopay/executions/:executionId/reject', adminAuthMiddleware, asyncHandler(rejectAutoPayExecutionController));

router.get('/services/imwallet-balance', adminAuthMiddleware, asyncHandler(getIMWalletBalance));
router.get('/services', adminAuthMiddleware, asyncHandler(getServiceTransactions));
router.post('/services/:id/check-status', adminAuthMiddleware, asyncHandler(checkServiceStatus));

router.get('/recharge-plans', adminAuthMiddleware, asyncHandler(getRechargePlans));
router.post('/recharge-plans', adminAuthMiddleware, asyncHandler(createRechargePlan));
router.put('/recharge-plans/:id', adminAuthMiddleware, asyncHandler(updateRechargePlan));
router.patch('/recharge-plans/:id/toggle', adminAuthMiddleware, asyncHandler(toggleRechargePlan));
router.delete('/recharge-plans/:id', adminAuthMiddleware, asyncHandler(deleteRechargePlan));

router.get('/vendors', adminAuthMiddleware, asyncHandler(getVendors));
router.get('/vendors/:id', adminAuthMiddleware, asyncHandler(getVendorDetail));
router.post('/vendors/:id/approve', adminAuthMiddleware, asyncHandler(approveVendor));
router.post('/vendors/:id/reject', adminAuthMiddleware, asyncHandler(rejectVendor));

router.get('/vendor-withdrawals', adminAuthMiddleware, asyncHandler(getVendorWithdrawals));
router.post('/vendor-withdrawals/:id/complete', adminAuthMiddleware, asyncHandler(completeVendorWithdrawal));
router.post('/vendor-withdrawals/:id/reject', adminAuthMiddleware, asyncHandler(rejectVendorWithdrawal));

router.get('/settings/profile', adminAuthMiddleware, asyncHandler(getAdminProfile));
router.patch('/settings/profile', adminAuthMiddleware, asyncHandler(updateAdminProfile));
router.patch('/settings/password', adminAuthMiddleware, asyncHandler(updateAdminPassword));
router.put('/settings/bank', adminAuthMiddleware, upload.single('qrCode'), processImage, asyncHandler(updateAdminBank));

router.get('/payments', adminAuthMiddleware, asyncHandler(getPayments));
router.post('/payments/:id/approve', adminAuthMiddleware, asyncHandler(approvePayment));
router.post('/payments/:id/reject', adminAuthMiddleware, asyncHandler(rejectPayment));


export default router;
