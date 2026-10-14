# Week 1 | Day 3: Domain Data Modeling & Zod Validation Middleware Pipeline
**Date:** 2026-10-14  
**Project:** Doom Portfolio (Production MERN + Next.js 3D System)  
**Status:** Completed  
**Milestone:** Mongoose Domain Schemas, Password Encryption, JWT Tokens & Request Validation Gate  

---

## 1. Executive Summary & Day 3 Goal
The objective of Day 3 is to forge the core data persistence models and the request validation shield:
1. **Generic Zod Validation Middleware (`src/middleware/validate.js`)**: Intercepts `req.body`, `req.query`, and `req.params` before controllers execute, rejecting bad payloads with standard HTTP 400 responses.
2. **User / Sovereign Model (`src/models/user.model.js`)**: Encapsulates admin credentials, `bcryptjs` password hashing (salt cost 12), and JWT token generation methods (30-minute Access Token, 7-day Refresh Token).
3. **Project / Artifact Model (`src/models/project.model.js`)**: Stores showcase metadata, Cloudinary image pointers, category enums, and high-performance compound indexing.
4. **Strict Zod Schemas (`src/validators/`)**: Uses `.strict()` constraints to prevent Mass Assignment attacks.
5. **Fail-Fast Environment Validation**: Added token secrets and expiration bounds to `src/config/env.js`.

---

## 2. Security & Architecture Decisions

### A. Why Salt Factor 12 with `bcryptjs`?
* **Cost Factor 12**: Calculates $2^{12} = 4,096$ key expansion rounds. On modern server hardware, this takes ~250–350ms per hash. This delay is negligible for legitimate logins, but makes brute-force dictionary attacks against leaked database hashes computationally infeasible.
* **Pure JavaScript (`bcryptjs`)**: Avoids C++ compilation dependencies (node-gyp / Python / Visual Studio Build Tools), ensuring seamless developer onboarding across Windows, macOS, and Linux Docker containers.

### B. Defense Against Mass Assignment via `.strict()`
Without schema sanitization, an attacker sending:
```json
{
  "email": "attacker@evil.com",
  "password": "Password123!",
  "role": "sovereign",
  "refreshToken": "malicious_token"
}
