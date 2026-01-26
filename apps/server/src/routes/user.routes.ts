import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { login } from '../controllers/user.controller.js';
const router = Router();

router.post('/auth/login', asyncHandler(login))

export default router;