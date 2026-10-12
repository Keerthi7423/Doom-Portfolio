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
