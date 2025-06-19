import { Database } from "node_modules/@vyral/core/src";




let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    const db = Database.getInstance();
    await db.connect({
      uri: process.env.MONGODB_URI!
    });
    
    isConnected = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw error;
  }
}
