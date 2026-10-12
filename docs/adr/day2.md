# Week 1 | Day 2: Server Architecture Modularization, Zod Config Validation & Enterprise Error Pipeline
**Date:** 2026-10-12  
**Project:** Doom Portfolio (Production MERN + Next.js 3D System)  
**Status:** Completed  
**Milestone:** Enterprise Backend Decoupling, Zod Runtime Validation, Centralized Error Infrastructure & Zero-Downtime Graceful Shutdown  

---

## 1. Executive Summary & Day 2 Goal
The objective of Day 2 is to elevate the raw Day 1 monolithic Express script into an enterprise-grade, loosely-coupled, testable, and resilient backend architecture:
1. **Decouple App from Server**: Split `app.js` (Express configuration, middleware pipeline, and route wiring) from `server.js` (physical network port listener, database connection, and OS signal management).
2. **Fail-Fast Environment Validation (`src/config/env.js`)**: Enforce strict Zod schema validation for all environment variables before the application boots. Zero direct `process.env` calls allowed across the rest of the codebase.
3. **Database Connection Lifecycle (`src/config/db.js`)**: Extract Mongoose connection logic into a dedicated module with runtime event listeners (`connected`, `error`, `disconnected`) and graceful disconnection helpers.
4. **Standardized Response & Error Subsystem (`src/utils/`)**:
   - `ApiError.js`: Custom operational error class extending native `Error` with HTTP status codes, V8 call stack cleanup, and validation payloads.
   - `ApiResponse.js`: Predictable success envelope (`statusCode`, `data`, `message`, `success`).
   - `asyncHandler.js`: Higher-order wrapper catching asynchronous rejections and routing them to Express error middleware without boilerplate `try/catch`.
5. **Centralized Error & 404 Middleware (`src/middleware/errorHandler.js`)**: Catch unhandled routes with a clean 404 JSON response, and intercept all application errors with environment-aware stack traces (visible in development, masked in production).
6. **Graceful OS Shutdown (`src/server.js`)**: Intercept `SIGINT` and `SIGTERM` signals, prevent incoming HTTP traffic, wait for active connections to finish, disconnect MongoDB, and exit safely without data corruption.

---

## 2. Architectural Evolution: Monolith to Decoupled Modular Citadel

### Day 1 (Monolith):
```text
server/src/server.js
  ├── dotenv.config()
  ├── express()
  ├── helmet(), cors(), morgan(), express.json()
  ├── GET /api/v1/health (Inline handler)
  ├── mongoose.connect()
  └── app.listen(5000)
```
* **Problems:** Impossible to unit test endpoints without binding physical ports; errors unhandled; unvalidated env strings; no graceful exit; single failure crashes entire server ungracefully.

### Day 2 (Decoupled Enterprise Pipeline):
```text
server/
├── .env
├── .env.example
├── package.json
└── src/
    ├── config/
    │   ├── env.js                ◄── Zod runtime schema validation (Fail-Fast)
    │   └── db.js                 ◄── Mongoose connection lifecycle & events
    ├── controllers/
    │   └── health.controller.js  ◄── Pure endpoint business logic
    ├── middleware/
    │   └── errorHandler.js       ◄── 404 Not Found & Global Error Handler (4 args)
    ├── routes/
    │   ├── health.routes.js      ◄── Resource route definitions
    │   └── index.js              ◄── Master API v1 router
    ├── utils/
    │   ├── ApiError.js           ◄── Custom operational HTTP error class
    │   ├── ApiResponse.js        ◄── Standardized response envelope
    │   └── asyncHandler.js       ◄── Promise rejection catcher (no try/catch bloat)
    ├── app.js                    ◄── Pure Express app instance & middleware (Testable)
    └── server.js                 ◄── Runtime entrypoint & Graceful Shutdown (SIGINT/SIGTERM)
```

---

## 3. The 5 Defensive Security Rings of Day 2

| Security Ring | Threat Prevented | How Our Code Stops It |
| :--- | :--- | :--- |
| **Ring 1: Fail-Fast Validation** | Secret misconfiguration, silent `undefined` crashes, bad port types. | `env.js` validates all variables with Zod at boot. If any secret is missing, it aborts within 1ms (`process.exit(1)`). |
| **Ring 2: Payload Limitation** | Denial of Service (DoS) via JSON memory exhaustion. | `express.json({ limit: '16kb' })` blocks any incoming payload larger than 16 kilobytes before it touches the CPU. |
| **Ring 3: Information Disclosure** | Leaking file paths, OS details, and database drivers to attackers. | `errorHandler.js` only sends `error.stack` if `NODE_ENV === 'development'`. Production completely strips it. |
| **Ring 4: CORS Origin Whitelist** | Cross-Site Scripting (XSS) attackers stealing cookies from unauthorized domains. | `cors({ origin: config.CORS_ORIGIN.split(',') })` restricts browser access strictly to trusted frontends (`localhost:5173`, `localhost:3000`). |
| **Ring 5: HTTP Header Hardening** | MIME confusion attacks, Clickjacking, protocol downgrades. | `helmet()` injects 15 strict HTTP response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, HSTS). |

---

## 4. Deep-Dive: Why Zod in Pure JavaScript Without TypeScript?

A frequent point of confusion is: *"Zod is marketed as TypeScript-first; why use it when writing pure JavaScript?"*

### A. The Core Reality: Compile-Time vs Runtime
* **TypeScript is a compile-time tool**: When JavaScript runs in production Node.js, TypeScript is **completely erased**. TypeScript cannot inspect `.env` on disk or read incoming HTTP JSON bodies from user browsers at runtime.
* **Zod is a 100% pure JavaScript runtime engine**: It executes in live memory while the server runs.

### B. In Pure JavaScript, You Have No Compiler Safety Net
In pure JavaScript, typos cause silent bugs:
```javascript
const port = process.env.PRT; // Typo! In JS, this is silently undefined.
app.listen(port);             // Node assigns a random ephemeral port without crashing!
```
Without TypeScript, JavaScript developers need runtime validation **even more** than TypeScript developers do. Zod serves as the strict runtime type-checker.

### C. "Parse, Don't Just Validate" & Type Coercion
Validation only checks: *"Is this input correct? (true/false)"*.  
Parsing checks, validates, sanitizes, and **transforms** the data.
* In Node.js, `process.env.PORT` is always a string (`"5000"`).
* In manual JavaScript, you would need verbose `parseInt(val, 10)` and `isNaN()` checks.
* In Zod:
  ```javascript
  PORT: z.coerce.number().default(5000)
  ```
  Zod automatically transforms `"5000"` into the integer `5000`, sets defaults, and catches non-numeric garbage like `"banana"`.

### D. Why Zod Beats Other JavaScript Validators

| Feature | Raw `if/else` | `express-validator` | `Joi` (Legacy) | `Zod` (Modern Gold Standard) |
| :--- | :--- | :--- | :--- | :--- |
| **Bundle Size** | 0 KB | Medium | Heavy (~150 KB) | **Ultra-lightweight (Zero dependencies)** |
| **Type Coercion** | Manual | Clunky | Clunky | **Built-in (`z.coerce`)** |
| **Reusability** | None | Express routes only | Universal | **Universal (Env, routes, DB, client)** |
| **Mass-Assignment Defense** | Manual | Manual | `.unknown(false)` | **Native `.strict()`** |
| **Developer Experience** | 50+ lines of clutter | Middleware chained | Verbose syntax | **Clean, declarative, composable** |

### E. Defense Against Mass-Assignment Attacks (`.strict()`)
In plain JavaScript, if an attacker injects extra fields into a POST request:
```json
{ "title": "My Project", "role": "admin" }
```
Plain JavaScript will blindly accept `req.body.role`. If passed to MongoDB, the attacker escalates privileges. Zod's `.strict()` rejects unexpected keys immediately at the gateway.

---

## 5. Microscopic Code Deep-Dive (File-by-File & Line-by-Line)

---

### 1. `server/src/config/env.js` (The Environment Gatekeeper)

```javascript
import dotenv from 'dotenv';
import { z } from 'zod';

// 1. Load the raw .env file into Node's process.env
dotenv.config();

// 2. Define the exact contract of what environment variables MUST exist
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z
    .coerce
    .number()
    .default(5000),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required to connect to MongoDB Atlas'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173,http://localhost:3000'),
});

// 3. Validate process.env against our schema
const parsedEnv = envSchema.safeParse(process.env);

// 4. Fail-Fast guard: If validation fails, halt the server immediately
if (!parsedEnv.success) {
  console.error('❌ Configuration error: Invalid or missing environment variables:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`   - [${issue.path.join('.')}]: ${issue.message}`);
  });
  process.exit(1);
}

// 5. Export the clean, validated configuration
export const config = parsedEnv.data;
```

#### Detailed Engineering Mechanics:
* **`dotenv.config()`**: Reads the physical `.env` file on disk, parses key-value pairs, and populates the OS-level `process.env` table.
* **`z.coerce.number()`**: In Node.js, `process.env.PORT` is always a string (`"5000"`). Coerce safely converts it into a number `5000`. If someone puts `"banana"`, Zod catches it.
* **`safeParse()`**: Does not throw an unhandled exception. It returns `{ success: true, data }` or `{ success: false, error }`.
* **`process.exit(1)`**: Halts execution immediately with failure code 1. Process managers (Docker, Kubernetes, PM2) immediately detect the exit and avoid sending traffic to an unconfigured server.
* **Architecture Rule:** `process.env` is **never** called anywhere else in the backend. All files must do: `import { config } from './config/env.js'`.

---

### 2. `server/src/config/db.js` (Resilient Database Lifecycle)

```javascript
import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Connect to MongoDB Atlas
 */
export async function connectDB() {
  try {
    // Event listener: Triggered if DB disconnects unexpectedly during runtime
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB connection lost. Attempting to reconnect...');
    });

    // Event listener: Triggered on connection error
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB runtime error:', err.message);
    });

    const conn = await mongoose.connect(config.MONGODB_URI);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }
}

/**
 * Gracefully disconnect from MongoDB (used during shutdown and testing)
 */
export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message);
  }
}
```

#### Detailed Engineering Mechanics:
* **Connection Event Listeners (`disconnected`, `error`)**: If a network hiccup or Atlas replica failover occurs 3 days after boot, the server doesn't fail silently—it logs the disconnection event and monitors automated reconnection.
* **`disconnectDB()`**: Cleanly drains Mongoose's internal socket connection pool. When shut down, Atlas receives an official TCP closure packet (`FIN`) instead of waiting for a ghost connection timeout.

---

### 3. `server/src/utils/ApiError.js` (Custom Operational Error Class)

```javascript
/**
 * Custom Operational Error Class for HTTP responses
 */
export class ApiError extends Error {
  constructor(
    statusCode,
    message = 'Something went wrong',
    errors = [],
    stack = ''
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
```

#### Detailed Engineering Mechanics:
* **`super(message)`**: Calls the parent native JavaScript `Error` constructor to set the base error message.
* **`this.statusCode`**: Adds HTTP status codes (`400`, `401`, `403`, `404`, `500`) which native JS errors lack.
* **`Error.captureStackTrace(this, this.constructor)`**: Uses Google V8's internal API to capture the stack trace while **omitting the `ApiError` class itself**. When you inspect the stack trace, the top frame points directly to the line of business code that failed, not to the error constructor!

---

### 4. `server/src/utils/ApiResponse.js` (Standardized Success Envelope)

```javascript
/**
 * Standardized Success Response Envelope
 */
export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
```

#### Detailed Engineering Mechanics:
* Guarantees that every frontend (Vite React Admin, Next.js Portfolio) always receives the exact same JSON contract:
```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "System is healthy",
  "success": true
}
```

---

### 5. `server/src/utils/asyncHandler.js` (Higher-Order Promise Wrapper)

```javascript
/**
 * Wraps an async controller function to eliminate boilerplate try/catch blocks
 */
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};
```

#### Detailed Engineering Mechanics:
* **The Problem:** In Express, if an `async` function throws an error and has no `try/catch`, the HTTP request hangs forever until socket timeout.
* **The Higher-Order Solution:** A function that takes a function and returns an Express middleware `(req, res, next)`.
* It wraps the controller in `Promise.resolve(...)`. If any error occurs, the `.catch(...)` routes it into Express's `next(err)`.
* **Benefit:** You will **never** have to write repetitive `try { ... } catch (err) { next(err); }` in your controllers again.

---

### 6. `server/src/middleware/errorHandler.js` (Central Error Pipeline)

```javascript
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

/**
 * 404 Not Found Middleware
 * Catches any request that didn't match any registered route
 */
export const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Global Centralized Error Handling Middleware
 * Must have exactly 4 arguments: (err, req, res, next)
 */
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error isn't an instance of our ApiError, convert it into one
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error?.errors || [], err.stack);
  }

  const response = {
    statusCode: error.statusCode,
    success: false,
    message: error.message,
    errors: error.errors,
    // Only reveal stack trace in development mode for debugging
    ...(config.NODE_ENV === 'development' && { stack: error.stack }),
  };

  res.status(error.statusCode).json(response);
};
```

#### Detailed Engineering Mechanics:
* **`notFound`**: Any URL requested that does not match registered routes falls through to this function. It creates an `ApiError(404, ...)` and calls `next(error)`.
* **The 4-Parameter Rule**: Express checks `fn.length`. If a function has **exactly 4 parameters** `(err, req, res, next)`, Express recognizes it as the Error Handler and routes all errors to it.
* **Sanitized Response**:
  * In **Development**: Attaches `stack` for quick debugging.
  * In **Production**: `stack` is omitted so attackers cannot inspect file paths, operating system details, or database versions.

---

### 7. `server/src/controllers/health.controller.js` & `server/src/routes/`

```javascript
// server/src/controllers/health.controller.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const getHealth = asyncHandler(async (req, res) => {
  const healthData = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'healthy',
  };

  res.status(200).json(new ApiResponse(200, healthData, 'System is healthy'));
});
```

```javascript
// server/src/routes/health.routes.js
import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();
router.get('/', getHealth);
export default router;
```

```javascript
// server/src/routes/index.js
import { Router } from 'express';
import healthRouter from './health.routes.js';

const router = Router();
router.use('/health', healthRouter);
export default router;
```

#### Detailed Engineering Mechanics:
* Implements the **MVC / Layered Architecture**: Routes define URLs, controllers execute logic, utils standardize envelopes. All future modules (`/auth`, `/projects`, `/messages`) plug seamlessly into `src/routes/index.js`.

---

### 8. `server/src/app.js` (Express App Factory)

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// 1. Core Security & Utility Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN.split(','),
    credentials: true,
  })
);
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// 2. Request Parsers with payload size limits (Defense in Depth)
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// 3. API Routes (Versioned under /api/v1)
app.use('/api/v1', apiRouter);

// 4. Catch-all for unhandled routes (404)
app.use(notFound);

// 5. Global Centralized Error Handler
app.use(errorHandler);

export default app;
```

---

### 9. `server/src/server.js` (Runtime Entrypoint & Graceful Shutdown)

```javascript
import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

/**
 * Gracefully shuts down HTTP server and database connections
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('🔒 HTTP server closed: No longer accepting new requests');
      await disconnectDB();
      console.log('👋 Process terminated gracefully');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

/**
 * Application Entrypoint
 */
async function startServer() {
  try {
    await connectDB();

    server = app.listen(config.PORT, () => {
      console.log(`🚀 Citadel Server active: http://localhost:${config.PORT} [${config.NODE_ENV}]`);
      console.log(`📡 Health probe available: http://localhost:${config.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('❌ Server startup failure:', error.message);
    process.exit(1);
  }
}

// OS Signal Traps
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Global Process Error Handlers
process.on('unhandledRejection', (reason) => {
  console.error('💥 Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

startServer();
```

---

## 6. Resilience & Reliability Engineering

### A. POSIX Signals Breakdown
* **`SIGINT` (Signal Interrupt, #2)**: Sent by the OS terminal when a developer presses `Ctrl + C`.
* **`SIGTERM` (Signal Terminate, #15)**: The graceful termination signal sent by Docker, Kubernetes, or AWS ECS when replacing or scaling containers.
* **`SIGKILL` (Signal Kill, #9)**: Forceful immediate process destruction. Applications cannot intercept `SIGKILL`. If our process does not exit within 10–30s of receiving `SIGTERM`, the container orchestrator sends `SIGKILL`.

### B. Socket Draining with `server.close()`
Calling `server.close()` does two things:
1. It stops accepting **new** TCP connections on port 5000.
2. It waits for active, in-flight HTTP requests to finish responding. Once the last active connection finishes, the callback fires, allowing us to safely call `disconnectDB()` and exit cleanly.

### C. Process Safety Nets
* **`unhandledRejection`**: Catches any asynchronous Promise rejected without a `.catch()` outside of Express. Triggers a clean shutdown.
* **`uncaughtException`**: Catches unhandled synchronous errors. Once an uncaught exception fires, Node's memory state is corrupted. The process must exit (`process.exit(1)`).

---

## 7. Master Technical Interview Questions & Answers

### Q1: Why use Zod in a pure JavaScript project without TypeScript?
**Answer:** TypeScript is only a compile-time tool that completely disappears in production; it cannot validate live `.env` strings or user payloads. Zod provides **runtime schema validation**, meaning it checks live data while the server is executing. In pure JavaScript, where there is no static type checker, Zod is even more valuable: it enforces the Fail-Fast principle, transforms types (like coercing string ports to numbers), and defends against mass-assignment attacks via `.strict()`.

### Q2: Why separate `app.js` and `server.js`?
**Answer:** Separation of concerns. `app.js` configures the middleware, routes, and business logic of the Express application without binding to a network port. This allows testing frameworks like Supertest to import `app.js` directly and run fast, in-memory integration tests without opening TCP sockets or colliding on ports (`EADDRINUSE`). `server.js` handles external environment lifecycle tasks: database initialization, port binding, and OS signals (`SIGINT`/`SIGTERM`).

### Q3: How does Express determine that a middleware is an error-handling middleware?
**Answer:** Express inspects the function's arity (the number of declared arguments via `fn.length`). Standard middleware functions take 2 or 3 arguments `(req, res)` or `(req, res, next)`. An error-handling middleware **must declare exactly 4 arguments**: `(err, req, res, next)`. If you omit `next` (declaring only 3 arguments), Express treats it as normal middleware and will not route errors to it.

### Q4: Why is validating environment variables with Zod at startup superior to fallback defaults (`process.env.VAR || fallback`)?
**Answer:** Fallback defaults mask misconfigurations and typos. For example, if `process.env.MONGODB_URI` has a typo, a fallback might cause the app to silently try to connect to a local or invalid database, failing much later during runtime. With Zod validation at startup, the application adheres to the "Fail-Fast" principle: it validates types, formats, and required presence immediately upon process initialization and halts execution before any invalid state can manifest.

### Q5: What is the purpose of Graceful Shutdown, and what steps must occur?
**Answer:** Graceful shutdown ensures zero dropped client requests and prevents database socket or transaction corruption during deployments or container restarts. When the OS sends `SIGTERM` or `SIGINT`:
1. The HTTP server stops accepting new connections (`server.close()`).
2. The server allows active in-flight requests to complete their responses.
3. Database connection pools are cleanly closed (`mongoose.connection.close()`).
4. The process exits with code 0.

### Q6: Why do we set payload size limits in `express.json({ limit: '16kb' })`?
**Answer:** Defense against Denial of Service (DoS) attacks. Without a limit, an attacker can send a 100MB malicious JSON file. The Node event loop will exhaust memory attempting to parse massive strings into JavaScript objects, resulting in out-of-memory crashes (`heap out of memory`). Restricting body size to reasonable limits (e.g. 16kb for standard JSON requests) repels payload bloat attacks at the middleware boundary.

### Q7: What is the significance of `Error.captureStackTrace(this, this.constructor)`?
**Answer:** It uses Google V8's internal API to capture the call stack while excluding the constructor of the custom error class (`ApiError`) from the stack trace. This ensures that when the error log is inspected, the very first line points directly to the file and line number in application code where the error originated, rather than pointing to the generic error utility wrapper.

### Q8: How does `asyncHandler` prevent Node memory leaks?
**Answer:** In Express, unhandled promise rejections inside route handlers cause the request to hang indefinitely. Each hanging request leaves an open TCP socket and associated memory allocated. `asyncHandler` ensures every rejected promise is captured with `.catch(err => next(err))`, guaranteeing that Express always returns an error response and closes the HTTP socket.

---

## 8. Daily Execution & Debugging Log

| Milestone / Test | Observed Behavior | Resolution & Verification |
| :--- | :--- | :--- |
| `env.js` Validation Test | Server halts when `MONGODB_URI` is omitted; outputs formatted Zod issues. | Verified fail-fast behavior with `process.exit(1)`. |
| Port Coercion | `PORT` loaded from string `"5000"`. | `z.coerce.number()` successfully converted string to integer. |
| MongoDB Disconnect Test | Mongoose disconnects cleanly upon signal. | `disconnectDB()` logged graceful closure without hanging. |
| Master Router Test | Sub-router mounted at `/api/v1/health`. | Router stack confirmed healthy initialization. |
| Live Endpoint Verification | `GET /api/v1/health` returned HTTP 200 with `ApiResponse` envelope. | Verified live response: `{ statusCode: 200, success: true, ... }`. |
| 404 Route Verification | `GET /api/v1/invalid-route` intercepted cleanly. | Verified live response: `{ statusCode: 404, success: false, ... }`. |

---

## 9. Day 2 Verification Checklist ("Done When")
- [x] `src/config/env.js` created with strict Zod validation schema.
- [x] `src/config/db.js` created with lifecycle event listeners and disconnect helper.
- [x] `src/utils/` created with `ApiError`, `ApiResponse`, and `asyncHandler`.
- [x] `src/middleware/errorHandler.js` created with 404 handler and 4-argument error middleware.
- [x] `src/controllers/health.controller.js` created and modularized.
- [x] `src/routes/health.routes.js` and `src/routes/index.js` created and mounted under `/api/v1`.
- [x] `src/app.js` decoupled from `server.js` (no `listen()` call).
- [x] `src/server.js` refactored with `SIGINT` / `SIGTERM` graceful shutdown logic.
- [x] Live HTTP tests verified: `GET /api/v1/health` (200) and `GET /api/v1/invalid-route` (404).
- [x] Architecture Decision Record `docs/adr/day2.md` written and recorded.
