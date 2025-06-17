import mongoose from 'mongoose';
import { Logger } from '..';

export interface DatabaseConfig {
  uri: string;
  options?: mongoose.ConnectOptions;
}

class Database {
  private static instance: Database;
  private isConnected: boolean = false;
  private logger = new Logger('Database');

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(config: DatabaseConfig): Promise<void> {
    if (this.isConnected) {
      this.logger.warn('Database is already connected');
      return;
    }

    try {
      const defaultOptions: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
      };

      await mongoose.connect(config.uri, {
        ...defaultOptions,
        ...config.options
      });

      this.isConnected = true;
      this.logger.info('Database connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        this.logger.error('Database connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        this.isConnected = false;
        this.logger.warn('Database disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        this.isConnected = true;
        this.logger.info('Database reconnected');
      });

    } catch (error) {
      this.logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      this.logger.info('Database disconnected successfully');
    } catch (error) {
      this.logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  public getConnection(): mongoose.Connection {
    return mongoose.connection;
  }

  public isConnectionReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export default Database;