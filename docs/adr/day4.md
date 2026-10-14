# Week 1 | Day 4: Sovereign Authentication System & Token Rotation Engine
**Date:** 2026-10-14  
**Project:** Doom Portfolio (Production MERN + Next.js 3D System)  
**Status:** Completed  
**Milestone:** Cookie-Based JWT Auth, Token Rotation, verifyJWT Gatekeeper & Admin Seeder  

---

## 1. Executive Summary & Day 4 Goal
The objective of Day 4 is to realize the **Protocol of the Sovereign** (Act IV from `Read.md`):
1. **Cookie Parsing & Hardening (`cookie-parser`, `src/utils/cookieOptions.js`)**: Configured strict, tamper-proof cookie options (`httpOnly`, `secure`, `sameSite=strict`).
2. **Gatekeeper Middleware (`src/middleware/auth.middleware.js`)**: Built `verifyJWT` to intercept private routes, verify cryptographic signatures, and attach `req.user`.
3. **Authentication Controller (`src/controllers/auth.controller.js`)**: Implemented `login`, `logout`, `refreshAccessToken`, and `getCurrentUser`.
4. **Token Rotation & Invalidation**: Every refresh rotates the refresh token in MongoDB, protecting against token reuse attacks.
5. **Standalone Seeder (`src/scripts/seedAdmin.js`)**: Isolated CLI script to seed the initial sovereign account with bcrypt cost factor 12 without exposing a public register route.

---

## 2. Security & Architectural Mechanics

### A. The Double-Cookie Pattern vs. LocalStorage
Storing JWTs in browser `localStorage` leaves tokens vulnerable to Cross-Site Scripting (XSS). If a third-party script runs in the browser, it can read `localStorage.getItem('token')`.
* We set `httpOnly: true`: The browser sends the cookie automatically on requests, but client-side JavaScript has zero access (`document.cookie` returns empty).
* We set `sameSite: 'strict'`: The browser refuses to send the cookie on cross-site requests, neutralizing Cross-Site Request Forgery (CSRF).

### B. Mongoose 8/9 Async Pre-Save Hook Pattern
In modern Mongoose (v8/v9), declaring an `async` function in `pre('save')` returns a Promise that Mongoose awaits natively. Passing and calling a `next()` parameter causes `next is not a function`. The modern pattern omits `next` entirely:
```javascript
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

C. Token Rotation & Reuse Detection
When /api/v1/auth/refresh-token is requested:

Incoming refresh token must match the hash stored on the user's document in MongoDB.
If it does not match, the token is flagged as compromised / previously used, and access is denied.
If valid, a new Access Token and a new Refresh Token are generated simultaneously, and the DB record is rotated.
3. Master Technical Interview Questions & Answers
Q1: What is Token Rotation and why is it superior to static refresh tokens?
Answer: In static refresh token implementations, a leaked refresh token allows an attacker to generate new access tokens indefinitely until the expiration date. In Token Rotation, every time a refresh token is used, it is invalidated and replaced with a newly issued token. If a previously used refresh token is presented, the server detects token replay and can revoke the user's active session immediately.

Q2: Why is the login route public while registration has no endpoint?
Answer: The Doom Citadel architecture follows the Principle of Zero Inbound Trust. The admin dashboard is intended strictly for the portfolio sovereign. Exposing a POST /api/v1/auth/register endpoint invites automated credential stuffing and bot account creation. Admin provisioning is strictly confined to secure administrative seed scripts executed on origin bastions.

---

### 📍 Step 9: Update Changelog & Commit

#### 1. In [Changelog.md](file:///d:/Projects/Personal%20Portfolio/doom-portfolio/Changelog.md), add:

```markdown
## [0.4.0] - 2026-10-14

### Added
- **Sovereign Authentication Controller (`src/controllers/auth.controller.js`)**: Implemented login, logout, refresh token rotation, and get-current-user endpoints.
- **Authentication Gatekeeper (`src/middleware/auth.middleware.js`)**: `verifyJWT` middleware decoding access tokens from cookies or Authorization headers.
- **Cookie Security Architecture (`src/utils/cookieOptions.js`)**: Standardized `httpOnly`, `Secure`, and `SameSite=Strict` options.
- **Admin Seeder Script (`src/scripts/seedAdmin.js`)**: CLI script to forge sovereign administrator accounts directly in MongoDB.
- **Authentication Routes (`src/routes/auth.routes.js`)**: Mounted under `/api/v1/auth`.

