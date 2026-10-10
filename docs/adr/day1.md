# Week 1 | Day 1: System Architecture, Code Deep-Dive & Server Foundation
**Date:** 2026-10-10  
**Project:** Doom Portfolio (Production MERN + Next.js 3D System)  
**Status:** Completed  
**Milestone:** Initial Backend Foundation, Architecture Blueprint & Day 1 Code Analysis  

---

## 1. Executive Summary & Day 1 Goal
The goal of Day 1 is to establish a solid, production-grade foundation:
1. Initialize the Express API using ECMAScript Modules (`"type": "module"`).
2. Wire up the foundational middleware pipeline (`helmet`, `cors`, `morgan`, `express.json`).
3. Connect Mongoose to a dedicated cloud MongoDB Atlas M0 cluster.
4. Expose an industry-standard `/api/v1/health` observability probe.
5. Secure the codebase with strict Git hygiene (`.gitignore`, `.env.example`).
6. Master the exact technical mechanics of every package, line of code, and security control.

---

## 2. Master System Architecture & Design Philosophy

### A. The 3-Application System Architecture
The system consists of three independent client/server tiers sharing a single backend:

```text
Visitor / You (Browser)
      │
      ▼
Cloudflare (DNS, Proxy, WAF, SSL, Rate Limiting, Access Gate)
      │
      ├── yourname.dev          ──► Cloudflare Workers : Portfolio (Next.js + React Three Fiber 3D)
      ├── admin.yourname.dev    ──► Cloudflare Pages   : Admin Panel (React + Vite) [Zero Trust Access Gate]
      └── api.yourname.dev      ──► Cloudflare Tunnel  ──► AWS EC2 Server
                                                                │
                                                                ├── Docker Container: cloudflared (Tunnel connector)
                                                                └── Docker Container: api (Node/Express API)
                                                                          │
                                                                          ├── MongoDB Atlas (Managed Database)
                                                                          └── Cloudinary (Asset & Media Storage)
```

### B. Core Architectural Principles (Interview Gold)
1. **Three Separate Applications, One API**:
   - The public portfolio and admin panel have entirely different user personas, threat models, and release cadences.
   - Separating them ensures that a Cross-Site Scripting (XSS) vulnerability or bug in the public portfolio can **never** expose admin functionality or admin tokens.
   - Each frontend can be deployed independently without server downtime.

2. **Stateless API Design**:
   - The API server stores **zero files** and **zero user session states** on its local container filesystem.
   - All structured documents live in MongoDB Atlas; all uploaded images and PDFs live in Cloudinary.
   - **Why this matters:** Containers can be destroyed, rolled back, horizontally scaled, or redeployed instantly without data loss.

3. **Zero Open Ports via Cloudflare Tunnel (`cloudflared`)**:
   - Traditional servers require opening ports 80, 443, and 22 (SSH) to the public internet, exposing them to automated port scans and DDoS attacks.
   - With Cloudflare Tunnel, the `cloudflared` daemon on the server establishes an **outbound-only** persistent connection to Cloudflare edge nodes.
   - Incoming traffic routes through Cloudflare's WAF and edge proxy directly into the tunnel. The EC2 instance security group has **zero inbound rules open to the internet**.

4. **Single Parent Domain & Cookie Security**:
   - All services share a single root domain (e.g., `yourname.dev`):
     - `yourname.dev` (Portfolio)
     - `admin.yourname.dev` (Admin Dashboard)
     - `api.yourname.dev` (Backend REST API)
   - Because they share the parent domain, secure session cookies configured with `Domain=.yourname.dev` and `SameSite=Strict` authenticate requests seamlessly between subdomains while preventing CSRF attacks.

5. **Defense in Depth**:
   - Security operates across 4 independent layers:
     `Cloudflare Edge (WAF & DDoS)` ➔ `Express Middleware (Helmet & Rate Limiting)` ➔ `Input Validation (Zod)` ➔ `Database Constraints (Mongoose Schema & Unique Indexes)`.
   - If any single layer fails, the next layer stops the attack.

---

## 3. Four Core System Request Flows

| Flow | End-to-End Execution Path |
| :--- | :--- |
| **1. Visitor loads Portfolio** | Browser ➔ Cloudflare ➔ Next.js Worker ➔ Server Component calls `GET /api/v1/projects` with a 60s cache (`revalidate: 60`). Tunnel routes request to Express ➔ MongoDB queried ➔ JSON returned ➔ HTML server-rendered and delivered to visitor. |
| **2. Admin logs in** | Cloudflare Access prompts for email one-time PIN (Zero Trust layer). Next, Admin SPA posts email & password to `/api/v1/auth/login`. Express validates credentials with `bcrypt.compare` (cost 12), sets two `httpOnly` secure cookies: short-lived Access Token (15 min) and long-lived Refresh Token (7 days). |
| **3. Admin uploads project image** | Admin UI submits `multipart/form-data`. Middleware order executes: Rate Limiter ➔ `requireAuth` ➔ Multer (memory buffer, size limit 5MB) ➔ Magic-byte MIME validation (`file-type`) ➔ Stream directly to Cloudinary ➔ Controller persists secure image URL and `imagePublicId` in MongoDB. |
| **4. Token refresh rotation** | Access token expires (15 min). API responds with `401 Unauthorized`. Admin Axios response interceptor intercepts the 401, issues a single-flight request to `/api/v1/auth/refresh`, validates & rotates the refresh token hash in MongoDB, updates cookies, and retries the original request seamlessly. |

---

## 4. Complete Repository Folder Structure & Responsibilities

### A. Root Level Layout
```text
doom-portfolio/
├── server/               # Express REST API (Node.js 20)
├── admin/                # Admin Panel SPA (React + Vite)
├── client/               # 3D Public Portfolio (Next.js App Router + React Three Fiber)
├── docs/                 # Architectural notes, ADRs, database schemas, runbooks
│   └── adr/              # Architecture Decision Records (ADRs)
├── .github/              # GitHub Actions CI/CD workflows, Dependabot
│   └── workflows/        # ci-server.yml, deploy-server.yml
├── docker-compose.yml    # Runs API + cloudflared tunnel containers
├── README.md             # Project documentation & local setup instructions
├── CHANGELOG.md          # Semantic versioning release history (v0.1.0, v1.0.0)
└── .gitignore            # Root git ignore rules
```

### B. Server Architecture (`server/src/`)
Every directory in the backend has **one single responsibility**:

| Folder / File | Single Job | Strict Rule to Follow |
| :--- | :--- | :--- |
| `src/config/` | Environment & connection setup (`env.js`, `db.js`, `cloudinary.js`) | **Only place where `process.env` is read**. Validated with Zod at startup. |
| `src/models/` | Mongoose document schemas & DB indexes | Pure database schema definition. No HTTP request or response logic allowed. |
| `src/routes/` | Maps URLs and HTTP methods to controllers | No business logic. Acts purely as a table of contents and middleware wiring. |
| `src/controllers/`| Handles single HTTP endpoints | Extracts inputs, calls services or models, sends responses. Kept lean. |
| `src/services/` | Reusable business logic | **Zero Express objects (`req`, `res`) allowed**. Pure JavaScript functions. |
| `src/middleware/` | Pre-processing chain before controllers | One concern per file (e.g. `requireAuth.js`, `validate.js`, `rateLimiters.js`). |
| `src/validators/` | Zod validation schemas | One schema per endpoint action. Must use `.strict()` to reject unknown fields. |
| `src/utils/` | Shared helper functions | Pure functions (`ApiError.js`, `asyncHandler.js`, `logger.js`). |
| `src/scripts/` | Standalone maintenance tasks (`seedAdmin.js`) | Run directly from CLI. Never imported by the running web application. |
| `src/app.js` | Configures Express app and middleware | **Does NOT call `listen()`**. Used by integration tests (`supertest`). |
| `src/server.js` | Application entrypoint | Connects to MongoDB, starts HTTP server, manages graceful shutdown. |

---

## 5. Deep Package-by-Package Breakdown (Why Each Was Chosen & Security)

### 1. `express` (^5.3.0) — The Core HTTP Engine
* **Purpose:** Minimalist framework wrapping Node.js native `http.createServer()`.
* **Why chosen:** Pure Node.js requires parsing streams and raw headers manually. Express provides the canonical `(req, res, next)` pipeline.
* **Architecture:** In Day 2, we will decouple `app.js` from `server.js` so test runners like Supertest can test endpoints in-memory without binding physical network sockets.

### 2. `helmet` (^8.3.0) — HTTP Response Header Hardening
* **Purpose:** Sets 15 secure HTTP response headers to protect against common web vulnerabilities.
* **Why chosen:** By default, Express reveals `X-Powered-By: Express` in response headers. Attackers use this to identify the framework and exploit known vulnerabilities. Helmet strips this header and adds:
  - `X-Content-Type-Options: nosniff`: Prevents browsers from MIME-sniffing a response away from the declared content-type (e.g. executing an uploaded malicious script disguised as a `.png`).
  - `X-Frame-Options: SAMEORIGIN`: Prevents clickjacking by forbidding third-party sites from embedding our pages inside hidden `<iframe>`s.
  - `Strict-Transport-Security` (HSTS): Enforces encrypted HTTPS communication.
  - `X-XSS-Protection: 0`: Disables legacy buggy XSS filters that introduced vulnerabilities.

### 3. `cors` (^2.8.6) — Cross-Origin Resource Sharing
* **Purpose:** Controls browser access permissions across different origins.
* **Why chosen:** Browsers enforce the Same-Origin Policy (SOP). The admin frontend running on port 5173 cannot call the API on port 5000 without CORS authorization.
* **Security Note:** CORS is a browser-enforced security boundary, not a network firewall. It protects users from cross-site scripts using their cookies; it does not protect the API from curl, Postman, or scrapers.

### 4. `morgan` (^1.12.1) — HTTP Access Logger
* **Purpose:** Logs every incoming HTTP request and outgoing response to the console.
* **Why chosen:** Essential for development observability. Logging format `morgan('dev')` outputs:
  `[HTTP Verb] [Route] [Status Code] [Response Time in ms] - [Response Size]`
  (e.g., `GET /api/v1/health 200 1.867 ms - 75`).

### 5. `express.json()` — Request Body Parser
* **Purpose:** Reads raw incoming TCP request streams, validates JSON syntax, and attaches the parsed object to `req.body`.
* **Security Note:** Without this middleware, `req.body` is `undefined`. On Day 12, we will restrict body size to 10kb (`express.json({ limit: '10kb' })`) to prevent Denial of Service via large payloads.

### 6. `dotenv` (^18.0.7) — Environment Configuration
* **Purpose:** Reads `.env` and populates `process.env`.
* **Security Note:** Adheres to Twelve-Factor App methodology. Separates secrets and configurations from source code.

### 7. `mongoose` (^9.11.1) — Object Data Modeling (ODM)
* **Purpose:** Manages connections and defines structured document schemas for MongoDB.
* **Why chosen:** Provides schema validation, type casting, query building, and built-in connection pooling over raw MongoDB drivers.

### 8. `zod` (^4.6.5) — Runtime Schema Validation
* **Purpose:** Type-safe runtime data validator.
* **Security Role:** While Mongoose validates at the database layer, Zod validates at the API edge (before controllers run), preventing malformed inputs and mass-assignment attacks with `.strict()`.

### 9. `nodemon` (^3.1.14) — Development Process Monitor (Dev Dependency)
* **Purpose:** Watches files for changes and restarts Node automatically.
* **Security Note:** Strictly placed in `devDependencies`. Never shipped in production Docker containers (`npm ci --omit=dev`), preventing dev-tool vulnerabilities from impacting live servers.

---

## 6. Line-by-Line Code Breakdown of `server/src/server.js`

```javascript
// Lines 1-6: ES Module Imports
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
```
* **Explanation:** Modern ECMAScript Module imports enabled by `"type": "module"` in `package.json`. Statically analyzed at startup for performance and tree-shaking.

```javascript
// Line 9: Environment Variable Initialization
dotenv.config();
```
* **Explanation:** Reads `.env` from the root of `server/` and parses key-value pairs into Node's global `process.env`. Must be called before accessing any environment variables.

```javascript
// Lines 11-13: Configuration Constants
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
```
* **Explanation:** Instantiates the Express application. Fallback `PORT || 5000` allows cloud hosting platforms to inject their own port dynamically while defaulting to 5000 locally.

```javascript
// Lines 16-19: The Middleware Pipeline
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
```
* **Order of Execution Mechanics:**
  1. `helmet()` runs first to inject security headers on every response, even if errors occur down the line.
  2. `cors()` handles cross-origin preflight requests immediately.
  3. `morgan('dev')` starts the latency timer for logging.
  4. `express.json()` parses the request body so downstream routes receive a populated `req.body`.

```javascript
// Lines 22-28: Observability Health Check Route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});
```
* **Explanation:**
  - `/api/v1/`: Versioned route path for future backward compatibility.
  - `status: 200`: Standard HTTP success code indicating the service is reachable.
  - `uptime: process.uptime()`: Number of seconds the Node process has run. Sudden resets indicate container crashes.
  - `timestamp`: Verifies server clock accuracy.

```javascript
// Lines 31-48: Resilient Server Startup
async function startServer() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup error:', error.message);
    process.exit(1);
  }
}

startServer();
```
* **Explanation:**
  - **Fail-Fast Configuration Guard:** Throws an error immediately if `MONGODB_URI` is missing rather than failing later on queries.
  - **Pre-Listen DB Verification:** We `await mongoose.connect()` **before** calling `app.listen()`. The server never accepts public HTTP traffic until the database connection is fully active.
  - **`process.exit(1)`:** Terminates with error code 1 on startup failure so Docker or process managers can detect failure and trigger automated restarts.

---

## 7. Master Technical Interview Questions & Answers

### Q1: Why must `.env` NEVER be committed to Git, and why is deleting the commit insufficient?
**Answer:** Git is an immutable Directed Acyclic Graph (DAG) that stores snapshots of every committed file in its packfiles (`.git/objects`). Deleting `.env` in a new commit does not remove the secret from prior commit history. Attackers cloning the repo can extract historical keys with `gitleaks` or `trufflehog`. If leaked, the credential must be immediately revoked and rotated at the provider level.

### Q2: Why should you avoid running `npm audit fix --force` blindly?
**Answer:** Running `npm audit fix --force` performs major version breaking changes. For example, npm suggests downgrading `nodemon` to 1.14.10 from 2018 to resolve a transitive `braces` regex ReDoS advisory. That ancient version breaks modern ES Modules. Since `nodemon` is a dev-only tool (`devDependencies`) that never runs in production, it is not reachable by untrusted public traffic.

### Q3: What is the cause of the `EADDRINUSE` error?
**Answer:** `EADDRINUSE` (*Error Address In Use*) occurs when the application attempts to bind an OS TCP socket to a port already claimed by another active process. To resolve it, terminate the existing process or bind to a different port.

### Q4: How does Cloudflare Tunnel eliminate port-scanning attacks?
**Answer:** Cloudflare Tunnel (`cloudflared`) creates an encrypted, outbound-only tunnel to Cloudflare's edge. The cloud server requires zero open inbound firewall ports (no port 80, 443, or 22). Automated port scanners and direct-to-IP attacks find no listening services on the server's public IP.

### Q5: Why separate `app.js` and `server.js`?
**Answer:** Decoupling `app.js` (Express configuration, middleware, and routes) from `server.js` (database connection and `app.listen()`) allows test tools like Supertest to import the app and test endpoints in memory without binding network ports or requiring a live database listener.

---

## 8. Daily Execution & Debugging Log

| Issue / Finding | Root Cause | Solution & Engineering Takeaway |
| :--- | :--- | :--- |
| `[nodemon] app crashed` on second terminal | Port 5000 was already bound by the first running instance (`EADDRINUSE`). | Recognized port collision; confirmed server is already active in terminal 1. |
| `npm audit` flagged `braces` high vulnerability | Transitive dependency in `chokidar` under dev-only `nodemon`. | Recognized dev-only scope; refused destructive `--force` downgrade to 2018. |
| Potential `.env` leak | Git tracks all files by default. | Shielded `.env` in root `.gitignore`; created sanitized `.env.example`. |

---

## 9. Day 1 Verification Checklist ("Done When")
- [x] Server initializes cleanly with ES modules (`npm run dev`).
- [x] MongoDB Atlas M0 cluster connects successfully via Mongoose.
- [x] `GET /api/v1/health` responds with HTTP 200 OK and uptime JSON.
- [x] Root `.gitignore` shields `.env` from repository tracking.
- [x] Sanitized `.env.example` created.
- [x] Full architecture blueprint, code deep dive, and interview notes recorded.
