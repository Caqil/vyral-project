import mongoose from 'mongoose';

export class Database {
  private static instance: Database;
  private connected = false;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async connect(options: { uri: string }): Promise<void> {
    if (this.connected) {
      console.log('📊 Database already connected');
      return;
    }

    try {
      console.log('🔌 Connecting to MongoDB...');
      
      await mongoose.connect(options.uri, {
        // Connection settings to prevent timeouts
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        bufferCommands: false, // Disable mongoose buffering
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 5, // Maintain a minimum of 5 socket connections
        maxIdleTimeMS: 30000, // Close connections after 30s of inactivity
        family: 4, // Use IPv4, skip trying IPv6
      });

      this.connected = true;
      console.log('✅ MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.log('🔌 MongoDB disconnected');
        this.connected = false;
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        this.connected = true;
      });

    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    
    await mongoose.disconnect();
    this.connected = false;
    console.log('🔌 MongoDB disconnected');
  }

  isConnected(): boolean {
    return this.connected && mongoose.connection.readyState === 1;
  }
}