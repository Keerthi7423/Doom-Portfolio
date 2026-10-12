import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * @desc    Health check probe
 * @route   GET /api/v1/health
 * @access  Public
 */
export const getHealth = asyncHandler(async (req, res) => {
  const healthData = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'healthy',
  };

  res.status(200).json(new ApiResponse(200, healthData, 'System is healthy'));
});
