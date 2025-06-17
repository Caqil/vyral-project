import mongoose from 'mongoose';
export interface DatabaseConfig {
    uri: string;
    options?: mongoose.ConnectOptions;
}
declare class Database {
    private static instance;
    private isConnected;
    private logger;
    private constructor();
    static getInstance(): Database;
    connect(config: DatabaseConfig): Promise<void>;
    disconnect(): Promise<void>;
    getConnection(): mongoose.Connection;
    isConnectionReady(): boolean;
}
export default Database;
//# sourceMappingURL=connection.d.ts.map