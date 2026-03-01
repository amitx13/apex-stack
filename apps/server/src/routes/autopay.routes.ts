import { Router } from 'express';
import {
    createAutoPayController,
    getUserAutoPaysController,
    pauseAutoPayController,
    resumeAutoPayController,
    cancelAutoPayController,
} from '../controllers/autopay.controller';
import { authMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../middlewares/asyncHandler';
import { requireUser } from '../middlewares/authRoles';

const router = Router();

// ── User routes ───────────────────────────────────────────────────────────────
router.get('/autopay', authMiddleware, requireUser, asyncHandler(getUserAutoPaysController));
router.post('/autopay', authMiddleware, requireUser, asyncHandler(createAutoPayController));
router.patch('/autopay/:autoPayId/pause', authMiddleware, requireUser, asyncHandler(pauseAutoPayController));
router.patch('/autopay/:autoPayId/resume', authMiddleware, requireUser, asyncHandler(resumeAutoPayController));
router.patch('/autopay/:autoPayId/cancel', authMiddleware, requireUser, asyncHandler(cancelAutoPayController));

export default router;
