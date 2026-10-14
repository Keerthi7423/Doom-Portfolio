import { config } from '../config/env.js';

/**
 * Hardened cookie security options for issuing auth tokens.
 * - httpOnly: Protects against XSS attacks (client-side JS cannot access document.cookie).
 * - secure: Enforces HTTPS in production mode.
 * - sameSite: 'strict' prevents Cross-Site Request Forgery (CSRF).
 */
export const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
};
