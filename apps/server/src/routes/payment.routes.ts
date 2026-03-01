import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { authMiddleware } from '../middlewares/auth.js';
import { getPaymentStatus, initiatePayment, submitPaymentProof } from '../controllers/payment.controller.js';
import { processImage, upload } from '../middlewares/upload.js';
import { requireUser } from '../middlewares/authRoles.js';
// import { 
//   initiatePayment, 
//   verifyPayment, 
//   handleCallback, 
//   handleWebhook
// } from '../controllers/payment.controller.js';

const router = Router();

// // Protected routes (require authentication)
// router.post('/initiate', authMiddleware, asyncHandler(initiatePayment));
// router.post('/verify', authMiddleware, asyncHandler(verifyPayment));


// // handler for paytm
// router.post('/callback', asyncHandler(handleCallback));
// router.post('/webhook',asyncHandler(handleWebhook))

router.post('/initiate', authMiddleware, requireUser, asyncHandler(initiatePayment));
router.post('/submit', authMiddleware, requireUser, upload.single('screenshot'), processImage, asyncHandler(submitPaymentProof));
router.get('/status', authMiddleware, requireUser, asyncHandler(getPaymentStatus));




export default router;
