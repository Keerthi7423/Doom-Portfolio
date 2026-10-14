import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cookieOptions } from '../utils/cookieOptions.js';
import { config } from '../config/env.js';

/**
 * Helper: Generates Access and Refresh tokens and persists Refresh Token in MongoDB
 */
const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token to user document
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

/**
 * @desc    Authenticate sovereign admin & issue cookies
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email and explicitly select password (which is select: false)
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  // Verify password using model instance method
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  // Strip password before returning user data
  const loggedInUser = await User.findById(user._id);

  return res
    .status(200)
    .cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 30 * 60 * 1000, // 30 minutes
    })
    .cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken },
        'Sovereign access granted'
      )
    );
});

/**
 * @desc    Log out sovereign admin, clear DB token & destroy cookies
 * @route   POST /api/v1/auth/logout
 * @access  Private (verifyJWT)
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear refresh token in database
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'Sovereign session terminated successfully'));
});

/**
 * @desc    Rotate and refresh access token via long-lived refresh token
 * @route   POST /api/v1/auth/refresh-token
 * @access  Public (via Refresh Cookie)
 */
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized: No refresh token provided');
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      config.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select('+refreshToken');

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token: User not found');
    }

    // Reuse Detection: Token in cookie must match the token stored in database
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token has expired or already been used');
    }

    // Token Rotation: Generate a fresh pair and persist the new refresh token
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 30 * 60 * 1000,
      })
      .cookie('refreshToken', newRefreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json(
        new ApiResponse(
          200,
          { accessToken },
          'Access token regenerated successfully'
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

/**
 * @desc    Get currently authenticated admin profile
 * @route   GET /api/v1/auth/me
 * @access  Private (verifyJWT)
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, 'Sovereign profile retrieved'));
});
