import mongoose from 'mongoose';
import { Logger } from '../utils/logger';
class Database {
    static instance;
    isConnected = false;
    logger = new Logger('Database');
    constructor() { }
    static getInstance() {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }
    async connect(config) {
        if (this.isConnected) {
            this.logger.warn('Database is already connected');
            return;
        }
        try {
            const defaultOptions = {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                bufferCommands: false,
                bufferMaxEntries: 0
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
        }
        catch (error) {
            this.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        try {
            await mongoose.disconnect();
            this.isConnected = false;
            this.logger.info('Database disconnected successfully');
        }
        catch (error) {
            this.logger.error('Failed to disconnect from database:', error);
            throw error;
        }
    }
    getConnection() {
        return mongoose.connection;
    }
    isConnectionReady() {
        return this.isConnected && mongoose.connection.readyState === 1;
    }
}
export default Database;
//# sourceMappingURL=connection.js.map