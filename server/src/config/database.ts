import mongoose from 'mongoose';
import { config } from './env';

export type DatabaseStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

let dbStatus: DatabaseStatus = 'disconnected';

/**
 * Connect to MongoDB Atlas via Mongoose.
 * Fails gracefully if MONGODB_URI is absent or invalid.
 */
export async function connectDatabase(): Promise<boolean> {
  if (!config.mongoUri) {
    dbStatus = 'disconnected';
    console.warn('==============================================');
    console.warn('⚠️  [MongoDB] Warning: MONGODB_URI is not configured in .env');
    console.warn('⚠️  Database-backed features will be unavailable until URI is provided.');
    console.warn('==============================================');
    return false;
  }

  try {
    dbStatus = 'connecting';
    mongoose.set('strictQuery', true);

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });

    dbStatus = 'connected';
    console.log('==============================================');
    console.log('🍃 [MongoDB] Successfully connected to MongoDB Atlas');
    console.log(`📦 [MongoDB] Database Host: ${mongoose.connection.host}`);
    console.log('==============================================');

    mongoose.connection.on('error', (err) => {
      dbStatus = 'error';
      console.error('❌ [MongoDB] Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      dbStatus = 'disconnected';
      console.warn('⚠️  [MongoDB] Lost connection to MongoDB Atlas');
    });

    mongoose.connection.on('reconnected', () => {
      dbStatus = 'connected';
      console.log('🍃 [MongoDB] Reconnected to MongoDB Atlas');
    });

    return true;
  } catch (error) {
    dbStatus = 'error';
    console.error('==============================================');
    console.error('❌ [MongoDB] Failed to connect to MongoDB Atlas:');
    console.error(error instanceof Error ? error.message : error);
    console.error('==============================================');
    return false;
  }
}

/**
 * Returns current database connection state string
 */
export function getDatabaseStatus(): DatabaseStatus {
  if (mongoose.connection.readyState === 1) return 'connected';
  if (mongoose.connection.readyState === 2) return 'connecting';
  return dbStatus;
}
