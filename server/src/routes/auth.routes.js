import { Router } from 'express';
import {
  login,
  logout,
  refreshAccessToken,
  getCurrentUser,
} from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.validator.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

// 🔓 Public Authentication Routes
router.post('/login', validate(loginSchema), login);
router.post('/refresh-token', refreshAccessToken);

// 🔒 Protected Sovereign Routes (Require valid Access Token)
router.post('/logout', verifyJWT, logout);
router.get('/me', verifyJWT, getCurrentUser);

export default router;
