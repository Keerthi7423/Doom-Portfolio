# Changelog

All notable changes to the **Doom Portfolio** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-10-12

### Added
- **Fail-Fast Environment Validation (`src/config/env.js`)**: Zod schema validation ensuring `PORT`, `NODE_ENV`, `MONGODB_URI`, and `CORS_ORIGIN` are verified before startup with zero unhandled runtime missing secrets.
- **Database Connection Lifecycle (`src/config/db.js`)**: Isolated Mongoose connection and graceful disconnection methods with event listeners for `disconnected` and `error`.
- **Response & Error Utilities (`src/utils/`)**:
  - `ApiError.js`: Custom operational HTTP error class extending native `Error`.
  - `ApiResponse.js`: Standardized success response envelope.
  - `asyncHandler.js`: Wrapper utility catching unhandled promise rejections without repetitive `try/catch`.
- **Centralized Error & 404 Middleware (`src/middleware/errorHandler.js`)**: Structured 404 handler for unknown routes and 4-argument global error middleware with environment-aware stack traces.
- **Modular Routing & Controllers (`src/controllers/`, `src/routes/`)**: Decoupled health check logic into `health.controller.js` and mounted versioned routes under `/api/v1`.
- **App Decoupling (`src/app.js`)**: Separated Express app configuration from physical server listening to enable fast in-memory integration testing.
- **Graceful Process Shutdown (`src/server.js`)**: Added handlers for `SIGINT` (Ctrl+C), `SIGTERM`, `unhandledRejection`, and `uncaughtException` to cleanly shut down HTTP sockets and database connections.
- **Documentation**: Added comprehensive Architecture Decision Record (`docs/adr/day2.md`).

---

## [0.1.0] - 2026-10-10

### Added
- Initialized Express backend with ECMAScript Modules (`"type": "module"`).
- Integrated core security and utility middleware (`helmet`, `cors`, `morgan`, `express.json`).
- Connected Mongoose to MongoDB Atlas M0 cluster.
- Implemented `/api/v1/health` observability probe.
- Configured Git hygiene with `.gitignore` and `.env.example`.
- Added Master System Architecture Blueprint and Day 1 ADR (`docs/adr/day1.md`).
