import { Router } from 'express';
import { rechargeController } from '../controllers/recharge.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Public route
router.post('/callback', asyncHandler(rechargeController.handleCallback));

// Protected routes
router.get('/operators/mobile', authMiddleware, asyncHandler(rechargeController.getMobileOperators));
router.post('/mobile', authMiddleware, asyncHandler(rechargeController.processMobileRecharge));
router.get('/history', authMiddleware, asyncHandler(rechargeController.getHistory));
router.get('/transaction/:orderId', authMiddleware, asyncHandler(rechargeController.getTransaction));

export default router;
