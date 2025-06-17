export declare enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}
export interface LogEntry {
    timestamp: string;
    level: string;
    context: string;
    message: string;
    data?: any;
    error?: Error;
}
export declare class Logger {
    private context;
    private logLevel;
    constructor(context?: string, logLevel?: LogLevel);
    error(message: string, error?: Error | any, data?: any): void;
    warn(message: string, data?: any): void;
    info(message: string, data?: any): void;
    debug(message: string, data?: any): void;
    private log;
    private formatLogEntry;
}
//# sourceMappingURL=logger.d.ts.map