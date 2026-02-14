import { Router } from 'express';
import { bbpsController } from '../controllers/bbps.controller';
import { asyncHandler } from '../middlewares/asyncHandler';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Get bbps operators
router.get('/operators/', authMiddleware, asyncHandler(bbpsController.getOperators));

// Fetch bbps bill
router.post('/fetch-bill', authMiddleware, asyncHandler(bbpsController.fetchBill));

// Process bbps bill payment
router.post('/pay-bill', authMiddleware, asyncHandler(bbpsController.payBill));

// Callback (public route)
router.post('/callback', asyncHandler(bbpsController.handleCallback));

export default router;
