export enum LogLevel {
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

export class Logger {
  private context: string;
  private logLevel: LogLevel;

  constructor(context: string = 'App', logLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.logLevel = logLevel;
  }

  error(message: string, error?: Error | any, data?: any): void {
    if (this.logLevel >= LogLevel.ERROR) {
      this.log(LogLevel.ERROR, message, data, error);
    }
  }

  warn(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.WARN) {
      this.log(LogLevel.WARN, message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, data);
    }
  }

  debug(message: string, data?: any): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      context: this.context,
      message,
      ...(data && { data }),
      ...(error && { error })
    };

    const output = this.formatLogEntry(entry);
    
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, context, message, data, error } = entry;
    let output = `[${timestamp}] ${level.padEnd(5)} [${context}] ${message}`;
    
    if (data) {
      output += ` | Data: ${JSON.stringify(data)}`;
    }
    
    if (error) {
      output += ` | Error: ${error.message}`;
      if (error.stack) {
        output += `\n${error.stack}`;
      }
    }
    
    return output;
  }
}
