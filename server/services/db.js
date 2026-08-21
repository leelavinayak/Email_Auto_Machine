import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vemu';

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000, bufferCommands: false });
    global.__DB_MODE__ = 'mongo';
    console.log('Connected to MongoDB');
  } catch (err) {
    console.log('MongoDB not reachable -> using built-in memory store.');
    global.__DB_MODE__ = 'memory';
    try { await mongoose.disconnect(); } catch {}
  }

  mongoose.connection.on('error', () => {
    if (global.__DB_MODE__ === 'mongo') {
      global.__DB_MODE__ = 'memory';
      console.log('MongoDB connection lost -> falling back to built-in memory store.');
    }
  });
  mongoose.connection.on('connected', () => {
    if (global.__DB_MODE__ !== 'mongo') {
      global.__DB_MODE__ = 'mongo';
      console.log('MongoDB connection restored.');
    }
  });
}

export const isMongo = () => global.__DB_MODE__ === 'mongo';
