import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { authMiddleware } from '../middlewares/auth.js';
import { 
  initiatePayment, 
  verifyPayment, 
  handleCallback, 
  handleWebhook
} from '../controllers/payment.controller.js';

const router = Router();

// Protected routes (require authentication)
router.post('/initiate', authMiddleware, asyncHandler(initiatePayment));
router.post('/verify', authMiddleware, asyncHandler(verifyPayment));


// handler for paytm
router.post('/callback', asyncHandler(handleCallback));
router.post('/webhook',asyncHandler(handleWebhook))

export default router;
