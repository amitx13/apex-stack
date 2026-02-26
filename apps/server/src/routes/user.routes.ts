import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { createNewUserAccount, createNewVendorAccount, fetchMe, getBankDetails, getProfileDetails, getRechargePlans, getReferralsController, getWalletTransactionsController, getWithdrawalBalance, login, updateUserProfile, userWallerBal } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
import { addBankDetails, generateVendorQR, getSettlements, getVendorByQr, getVendorDailySales, getVendorQR, getVendorTransactionHistory, getVendorWallet, requestInstantSettlement, updateBankDetails, updateProfile, updateVendorComissionRate, vendorWallerBal } from '../controllers/vendor.controller.js';
import { requireUser, requireUserOrVendor, requireVendor } from '../middlewares/authRoles.js';
import { processImage, upload } from '../middlewares/upload.js';
import { scanPayController } from '../controllers/user.scan.controller.js';
import { getWithdrawalDataController, requestWithdrawalController } from '../controllers/withdrawal.controller.js';
import { createBillRequestController, getBillRequestsController } from '../controllers/bill.controller.js';
const router = Router();


// User Routes

router.post('/auth/login', asyncHandler(login))
router.post('/auth/signUp', asyncHandler(createNewUserAccount))
router.patch('/updateUserProfile', authMiddleware, requireUser, asyncHandler(updateUserProfile));
router.get('/userWallerBal', authMiddleware, requireUser, asyncHandler(userWallerBal))
router.get('/getWithdrawalBalance', authMiddleware, requireUser, asyncHandler(getWithdrawalBalance))
router.get('/wallet/transactions', authMiddleware, requireUser, asyncHandler(getWalletTransactionsController))
router.get('/referrals', authMiddleware, requireUser, asyncHandler(getReferralsController));
router.get('/withdrawal', authMiddleware, requireUser, asyncHandler(getWithdrawalDataController));
router.get('/recharge/plans', authMiddleware, requireUser, asyncHandler(getRechargePlans));
router.post('/withdrawal/request', authMiddleware, requireUser, asyncHandler(requestWithdrawalController));
router.get('/bills', authMiddleware, requireUser, asyncHandler(getBillRequestsController));
router.post('/bills', authMiddleware, requireUser, upload.single('billImage'), processImage, asyncHandler(createBillRequestController));

router.get('/auth/fetchMe', authMiddleware, asyncHandler(fetchMe))
router.get('/getBankDetails', authMiddleware, asyncHandler(getBankDetails))
router.get('/getProfileDetails', authMiddleware, requireUserOrVendor, asyncHandler(getProfileDetails))
router.post('/addBankDetails', authMiddleware, requireUserOrVendor, upload.single("qrCode"), processImage, asyncHandler(addBankDetails))
router.put('/updateBankDetails', authMiddleware, requireUserOrVendor, upload.single("qrCode"), processImage, asyncHandler(updateBankDetails))

router.get('/getVendorByQr/:vendorId', authMiddleware, requireUser, asyncHandler(getVendorByQr));
router.post('/scanPay', authMiddleware, requireUser, asyncHandler(scanPayController));

// Vendor Routes
router.get('/getVendorQR', authMiddleware, requireVendor, asyncHandler(getVendorQR))
router.get('/getVendorWallet', authMiddleware, requireVendor, asyncHandler(getVendorWallet))
router.get('/getSettlements', authMiddleware, requireVendor, asyncHandler(getSettlements))
router.get('/vendorWallerBal', authMiddleware, requireVendor, asyncHandler(vendorWallerBal))
router.get('/todayCollection', authMiddleware, requireVendor, asyncHandler(getVendorDailySales))
router.get('/transactions', authMiddleware, requireVendor, asyncHandler(getVendorTransactionHistory));
router.post('/auth/signUpVendor', asyncHandler(createNewVendorAccount))
router.put('/updateVendorComissionRate', authMiddleware, requireVendor, asyncHandler(updateVendorComissionRate))
router.post('/requestInstantSettlement', authMiddleware, requireVendor, asyncHandler(requestInstantSettlement))
router.post('/generateVendorQr', authMiddleware, requireVendor, asyncHandler(generateVendorQR))
router.put('/updateProfile', authMiddleware, requireVendor, asyncHandler(updateProfile))

export default router;



/* // ── Admin routes ──────────────────────────────────────────────────────────────
router.patch('/withdrawal/:withdrawalId/complete', verifyAdmin, asyncHandler(completeWithdrawalController));
router.patch('/withdrawal/:withdrawalId/reject',   verifyAdmin, asyncHandler(rejectWithdrawalController)); 
router.patch('/bills/:billRequestId/complete', verifyAdmin, asyncHandler(completeBillRequestController));
router.patch('/bills/:billRequestId/reject',   verifyAdmin, asyncHandler(rejectBillRequestController));
*/