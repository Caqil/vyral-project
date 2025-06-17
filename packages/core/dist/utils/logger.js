export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
export class Logger {
    context;
    logLevel;
    constructor(context = 'App', logLevel = LogLevel.INFO) {
        this.context = context;
        this.logLevel = logLevel;
    }
    error(message, error, data) {
        if (this.logLevel >= LogLevel.ERROR) {
            this.log(LogLevel.ERROR, message, data, error);
        }
    }
    warn(message, data) {
        if (this.logLevel >= LogLevel.WARN) {
            this.log(LogLevel.WARN, message, data);
        }
    }
    info(message, data) {
        if (this.logLevel >= LogLevel.INFO) {
            this.log(LogLevel.INFO, message, data);
        }
    }
    debug(message, data) {
        if (this.logLevel >= LogLevel.DEBUG) {
            this.log(LogLevel.DEBUG, message, data);
        }
    }
    log(level, message, data, error) {
        const entry = {
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
        }
        else if (level === LogLevel.WARN) {
            console.warn(output);
        }
        else {
            console.log(output);
        }
    }
    formatLogEntry(entry) {
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
//# sourceMappingURL=logger.js.map