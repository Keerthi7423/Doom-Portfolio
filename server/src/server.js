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
    // 1. Connect to MongoDB Atlas first
    await connectDB();

    // 2. Start HTTP listener
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
