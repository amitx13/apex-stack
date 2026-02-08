import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { createNewUserAccount, fetchMe, login, loginWithOtp } from '../controllers/user.controller.js';
import { authMiddleware } from '../middlewares/auth.js';
const router = Router();

router.post('/auth/login', asyncHandler(login))
router.post('/auth/loginWithOtp', asyncHandler(loginWithOtp))
router.post('/auth/signUp', asyncHandler(createNewUserAccount))

router.get('/auth/fetchMe', authMiddleware, asyncHandler(fetchMe))

export default router;