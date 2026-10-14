# ⚔️ Day 4: Sovereign Authentication & Token Rotation Engine

This document contains the complete code breakdown, security architecture, and interview mastery for **Day 4** of Project Doom.

---

## 1. Complete Code Breakdown

### A. Cookie Security Options Helper (`server/src/utils/cookieOptions.js`)
```javascript
import { config } from '../config/env.js';

export const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: 'strict',
};
```
- **`httpOnly: true`**: JavaScript running in the browser (`document.cookie`) cannot read or access the cookie. Shields against Cross-Site Scripting (XSS) token theft.
- **`secure: config.NODE_ENV === 'production'`**: Transmits cookies strictly over encrypted HTTPS connections in production, preventing man-in-the-middle packet sniffing.
- **`sameSite: 'strict'`**: The browser refuses to send the cookie on cross-site requests, completely stopping Cross-Site Request Forgery (CSRF).

---

### B. Auth Gatekeeper Middleware (`server/src/middleware/auth.middleware.js`)
```javascript
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';
import { User } from '../models/user.model.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError(401, 'Unauthorized request: No access token provided');
  }

  try {
    const decodedToken = jwt.verify(token, config.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select('-refreshToken');

    if (!user) {
      throw new ApiError(401, 'Invalid access token: User no longer exists');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Access token expired');
    }
    throw new ApiError(401, error?.message || 'Invalid access token');
  }
});
```
- **Dual Token Extraction**: Prioritizes `req.cookies.accessToken` (standard browser client) while allowing `Authorization: Bearer <token>` (Postman / mobile clients).
- **`select('-refreshToken')`**: Excludes the refresh token from being attached to `req.user`.
- **`TokenExpiredError` Catch**: Returns an explicit `Access token expired` message so frontend Axios response interceptors know to trigger silent token refresh.

---

### C. Sovereign Auth Controller (`server/src/controllers/auth.controller.js`)
```javascript
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cookieOptions } from '../utils/cookieOptions.js';
import { config } from '../config/env.js';

const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const loggedInUser = await User.findById(user._id);

  return res
    .status(200)
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 30 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, { user: loggedInUser, accessToken }, 'Sovereign access granted'));
});

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true });
  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'Sovereign session terminated successfully'));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) throw new ApiError(401, 'Unauthorized: No refresh token provided');

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, config.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select('+refreshToken');

    if (!user || incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token has expired or already been used');
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 30 * 60 * 1000 })
      .cookie('refreshToken', newRefreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
      .json(new ApiResponse(200, { accessToken }, 'Access token regenerated successfully'));
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, 'Sovereign profile retrieved'));
});
```

---

## 2. Directory Architecture: Why These Folders Were Used in Day 4

| Folder | Day 4 Implementation | Why It Exists & Why It Is Useful |
| :--- | :--- | :--- |
| **`src/utils/`** | `cookieOptions.js` | **Consistent Security Configuration.** Ensures `httpOnly`, `secure`, and `sameSite` flags are identical across `res.cookie()` and `res.clearCookie()` without duplicating settings. |
| **`src/middleware/`**| `auth.middleware.js` (`verifyJWT`) | **Reusability & Gatekeeping.** Any route needing protection can simply add `verifyJWT` to its middleware chain. Controllers do not need to parse headers or verify tokens. |
| **`src/controllers/`**| `auth.controller.js` | **Pure Endpoint Logic.** Coordinates password validation, token generation, cookie setting, and database token rotation in one focused module. |
| **`src/routes/`** | `auth.routes.js` | **Clean URL Mapping.** Mounts `/login`, `/logout`, `/refresh-token`, `/me` with their respective middleware, decoupled from server startup logic. |
| **`src/scripts/`** | `seedAdmin.js` | **Zero-Trust Administrative Provisioning.** Runs from CLI to forge the admin account without exposing a dangerous public registration endpoint. |

---

## 3. Day 4 Technical Interview Questions (Basic to Advanced)

### 🟢 Level 1: Basic
#### Q1: What is `cookie-parser`, and why do we need it in Express?
- **Answer:** Express does not parse the HTTP `Cookie` request header by default (`req.cookies` is undefined). `cookie-parser` inspects the raw `Cookie` header string sent by the browser, parses key-value pairs into a clean JavaScript object, and attaches it to `req.cookies`.

#### Q2: What are the risks of storing tokens in browser `localStorage`?
- **Answer:** `localStorage` is vulnerable to Cross-Site Scripting (XSS). Any malicious script injected via an unescaped input, compromised CDN, or rogue npm package can execute `localStorage.getItem('token')` and transmit credentials to an attacker.

---

### 🟡 Level 2: Intermediate
#### Q3: What do `httpOnly`, `Secure`, and `SameSite=Strict` do on a cookie?
- **Answer:**
  - `httpOnly`: Forbids client-side JavaScript from reading `document.cookie`, stopping XSS token theft.
  - `Secure`: Tells the browser to transmit the cookie strictly over encrypted HTTPS connections.
  - `SameSite=Strict`: Tells the browser never to send the cookie during cross-site requests, stopping Cross-Site Request Forgery (CSRF).

#### Q4: Why is there no `POST /api/v1/auth/register` route in Project Doom?
- **Answer:** The Zero-Trust Architecture Principle. Public registration endpoints invite credential stuffing, spam bots, and unauthorized accounts. Project Doom is an exclusive personal portfolio where only the Sovereign Admin may enter. Admin provisioning is strictly confined to an isolated CLI seed script (`seedAdmin.js`).

---

### 🟠 Level 3: Advanced
#### Q5: What is Token Rotation, and what attack does it neutralize?
- **Answer:** In traditional systems, a leaked refresh token allows an attacker to generate new access tokens until expiration. With Token Rotation, every time a refresh token is used, it is destroyed in MongoDB and replaced with a newly issued token. If an attacker attempts to use a stolen, previously used refresh token, the server detects token replay and revokes the active session immediately.

#### Q6: Why did we set Access Token expiry to 30 minutes and Refresh Token to 7 days?
- **Answer:** Principle of Least Privilege. Access tokens are transmitted with every authorized HTTP request, increasing their exposure to interception. A short 30-minute lifespan minimizes the exposure window. Refresh tokens are long-lived (7 days) but are strictly confined to `httpOnly` cookies and sent only to the isolated `/refresh-token` endpoint.

---

### 🔴 Level 4: Senior
#### Q7: How does the frontend handle token expiration without logging the user out (Silent Refresh)?
- **Answer:**
  1. The client makes an API request with an expired access token.
  2. `verifyJWT` catches `TokenExpiredError` and responds with HTTP 401 (`'Access token expired'`).
  3. The frontend Axios response interceptor intercepts the 401 error.
  4. The interceptor pauses pending requests and makes a single call to `POST /api/v1/auth/refresh-token`.
  5. The server rotates tokens and sets new cookies.
  6. The interceptor retries the original request with the fresh token without any visible UI flicker.
🛡️ PART 1: CORE CONCEPTS & SECURITY ARCHITECTURE
1. The Double-Cookie Pattern vs. LocalStorage
As a frontend developer, you likely stored tokens in localStorage.setItem('token', token).
Here is why that is banned in production-grade backend engineering:

The Vulnerability (localStorage): If a rogue npm package or an XSS injection executes in the browser, it runs localStorage.getItem('token') and sends the token directly to an attacker.
The Solution (httpOnly Cookies): The browser automatically attaches the cookie to requests made to the API, but client-side JavaScript has zero access (document.cookie returns empty). An attacker's malicious script cannot read or steal it!
2. Token Lifecycles & Security Flags
Token	Lifespan	Stored Where?	Why this Lifespan?
Access Token	30 Minutes	httpOnly Cookie	High frequency. Sent with every authorized request. Short lifespan limits exposure if intercepted.
Refresh Token	7 Days	httpOnly Cookie + MongoDB	Low frequency. Sent only to /api/v1/auth/refresh-token. Rotated on every single use.
3. Token Rotation & Reuse Detection (The Bank Security Standard)
When a user calls /refresh-token, we don't just verify the JWT signature.
We check: Does the incoming refresh token match user.refreshToken in MongoDB?
If YES: We generate a brand new Access Token and a brand new Refresh Token, update MongoDB, and issue new cookies. The old refresh token is destroyed!
If NO: An attacker is attempting to replay an old, stolen refresh token. We immediately reject the request and deny access.
4. Protocol of Token Rebirth (Silent Refresh)
How the frontend and backend talk to each other without logging the user out:

Access token expires (after 30 mins).
The visitor makes an API call ➔ verifyJWT returns HTTP 401 Unauthorized with message "Access token expired".
The frontend Axios response interceptor intercepts the 401 error.
The interceptor calls POST /api/v1/auth/refresh-token.
The backend validates the refresh cookie, updates MongoDB, and issues a new cookie pair.
The interceptor retries the original request seamlessly with zero UI interruption.
📁 PART 2: WHY WE CREATED THESE FOLDERS IN DAY 4
Folder	What We Put In Day 4	Why It Exists & Why It Is Useful
src/utils/	cookieOptions.js	Centralized Security Flags. Guarantees httpOnly, secure, and sameSite settings are 100% identical between res.cookie() and res.clearCookie() so cookies don't fail to clear on logout.
src/middleware/	auth.middleware.js (verifyJWT)	Reusable Route Gatekeeper. Any route needing protection simply adds verifyJWT to its chain (router.post('/logout', verifyJWT, logout)). Controllers never need to manually decode JWTs.
src/controllers/	auth.controller.js	Dedicated Endpoint Logic. Orchestrates user lookup, password checks, cookie generation, and token rotation in one focused place.
src/routes/	auth.routes.js	Routing Blueprint. Connects URL endpoints (/login, /logout, /refresh-token, /me) to their middleware and controllers.
src/scripts/	seedAdmin.js	Zero-Trust Administrative Provisioning. CLI tool to forge the sovereign account directly into MongoDB without exposing a dangerous public registration route.
🎙️ PART 3: HOW INTERVIEWERS ASK ABOUT DAY 4
What the Interviewer Says	The Underlying Technical Question
"How do you handle user authentication and session management?"	Double-cookie pattern (httpOnly), Access Token (30m) vs Refresh Token (7d).
"Why not just put the JWT in localStorage?"	XSS vulnerability defense. Why httpOnly, Secure, and SameSite=Strict protect cookies.
"What happens when a user's token expires? Do they have to log in again?"	Token Rotation, Axios interceptor, and the Silent Refresh protocol.
"Why don't you have a register endpoint in your API?"	Zero-Trust Architecture; protecting against bot account creation and credential stuffing via CLI seeder.
🎯 PART 4: INTERVIEW QUESTIONS (BASIC TO ADVANCED)
🟢 Level 1: Basic
Q1: What is cookie-parser, and why is it needed in Express?
Answer: Express does not parse incoming HTTP Cookie headers by default; without middleware, req.cookies is undefined. cookie-parser reads the raw cookie string from the request headers, parses the key-value pairs, and populates req.cookies as a clean JavaScript object.
Q2: What is the security flaw of storing authentication tokens in localStorage?
Answer: Any JavaScript running on the client can read localStorage.getItem('token'). If the site has a Cross-Site Scripting (XSS) vulnerability or a compromised third-party script, an attacker can steal the token. httpOnly cookies block JavaScript access entirely.
🟡 Level 2: Intermediate
Q3: What do the httpOnly, Secure, and SameSite=Strict cookie options do?
Answer:
httpOnly: true: JavaScript (document.cookie) cannot read the cookie, neutralizing XSS theft.
secure: true: Enforces that the cookie is transmitted only over HTTPS, preventing packet interception.
sameSite: 'strict': The browser refuses to send the cookie during cross-site requests, completely preventing Cross-Site Request Forgery (CSRF).
Q4: Why is there no public user registration endpoint in Project Doom?
Answer: The Principle of Zero Inbound Trust. Project Doom is an exclusive portfolio citadel for the sovereign admin. Exposing a public POST /register endpoint invites automated spam bots, credential stuffing, and unauthorized accounts. Admin provisioning is strictly confined to an isolated CLI script (seedAdmin.js).
🟠 Level 3: Advanced
Q5: What is Token Rotation, and how does it protect against token theft?
Answer: In traditional token designs, a leaked refresh token allows an attacker to generate new access tokens until expiration. With Token Rotation, every time a refresh token is used, it is destroyed in MongoDB and replaced with a newly issued token. If an attacker presents an old, previously used refresh token, the server detects token replay and immediately revokes the session.
Q6: Why set Access Token expiry to 30 minutes while Refresh Token is 7 days?
Answer: Principle of Least Privilege and Attack Surface Reduction. Access tokens are sent with every single API call, making them more exposed to interception. A 30-minute lifespan strictly limits the window of opportunity for an attacker. Refresh tokens live for 7 days but are sent only to the isolated /refresh-token endpoint.
🔴 Level 4: Senior
Q7: How does the client handle token expiration without UI flicker (Silent Refresh)?
Answer:
The client makes an API request using an expired access token.
verifyJWT detects the expired token and responds with HTTP 401 ("Access token expired").
The frontend Axios response interceptor intercepts the 401 error.
The interceptor pauses queued requests and makes a single call to POST /api/v1/auth/refresh-token.
The server rotates tokens and issues fresh cookies.
The interceptor retries the original request with the fresh token without any UI interruption or forced logout.
Take your time reading and writing these down! Let me know if you want to quiz yourself on any of these Day 4 questions!

