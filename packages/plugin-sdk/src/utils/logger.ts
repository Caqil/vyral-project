export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  error?: Error;
}

export class Logger {
  private context: string;
  private logLevel: LogLevel;
  private handlers: Array<(entry: LogEntry) => void> = [];

  constructor(context: string = 'Plugin', logLevel: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.logLevel = logLevel;

    // Default console handler
    this.addHandler(this.consoleHandler.bind(this));
  }

  public debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  public info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  public error(message: string, error?: Error | any, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  private log(level: LogLevel, message: string, data?: any, error?: Error): void {
    if (level < this.logLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      context: this.context,
      message,
      data,
      error
    };

    this.handlers.forEach(handler => {
      try {
        handler(entry);
      } catch (handlerError) {
        console.error('Error in log handler:', handlerError);
      }
    });
  }

  public addHandler(handler: (entry: LogEntry) => void): void {
    this.handlers.push(handler);
  }

  public removeHandler(handler: (entry: LogEntry) => void): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  private consoleHandler(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] ${levelName.padEnd(5)} [${entry.context}]`;

    let output = `${prefix} ${entry.message}`;

    if (entry.data) {
      output += ` | Data: ${JSON.stringify(entry.data)}`;
    }

    if (entry.error) {
      output += ` | Error: ${entry.error.message}`;
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        if (entry.error?.stack) console.warn(entry.error.stack);
        break;
      case LogLevel.ERROR:
        console.error(output);
        if (entry.error?.stack) console.error(entry.error.stack);
        break;
    }
  }

  public setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public getLevel(): LogLevel {
    return this.logLevel;
  }
}