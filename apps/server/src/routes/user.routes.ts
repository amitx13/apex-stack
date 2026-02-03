import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { createNewUserAccount, login, loginWithOtp } from '../controllers/user.controller.js';
const router = Router();

router.post('/auth/login', asyncHandler(login))
router.post('/auth/loginWithOtp', asyncHandler(loginWithOtp))
router.post('/auth/signUp', asyncHandler(createNewUserAccount))

export default router;