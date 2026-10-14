import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';
import { User } from '../models/user.model.js';

/**
 * Middleware to authenticate requests via JWT.
 * Extracts token from either httpOnly cookies or Authorization Bearer header.
 */
export const verifyJWT = asyncHandler(async (req, res, next) => {
  // 1. Extract token from cookie (preferred) OR Authorization header
  const token =
    req.cookies?.accessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'Unauthorized request: No access token provided');
  }

  try {
    // 2. Cryptographically verify token signature and expiry
    const decodedToken = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

    // 3. Look up user by ID (excluding sensitive fields)
    const user = await User.findById(decodedToken?._id).select('-refreshToken');

    if (!user) {
      throw new ApiError(401, 'Invalid access token: User no longer exists');
    }

    // 4. Attach verified user to request object for downstream controllers
    req.user = user;
    next();
  } catch (error) {
    // Distinguish expired tokens so frontend can trigger silent refresh
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired');
    }
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});
