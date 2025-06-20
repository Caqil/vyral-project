const fs = require('fs');
const path = require('path');

/**
 * Error handling utilities for S3 Storage Module
 */

class ErrorLogger {
  constructor() {
    this.logLevel = process.env.S3_LOG_LEVEL || 'info';
    this.logFile = process.env.S3_LOG_FILE || null;
    this.maxLogSize = 10 * 1024 * 1024; // 10MB
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {Error|object} error - Error object or additional data
   */
  logError(message, error = null) {
    this.log('error', message, error);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {Error|object} error - Error object or additional data
   */
  logWarning(message, error = null) {
    this.log('warn', message, error);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {object} data - Additional data
   */
  logInfo(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {object} data - Additional data
   */
  logDebug(message, data = null) {
    this.log('debug', message, data);
  }

  /**
   * Generic log method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  log(level, message, data = null) {
    const levelNum = this.logLevels[level];
    const currentLevelNum = this.logLevels[this.logLevel];

    if (levelNum > currentLevelNum) {
      return; // Skip logging if level is too low
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      module: 'S3Storage'
    };

    // Add error details if provided
    if (data) {
      if (data instanceof Error) {
        logEntry.error = {
          name: data.name,
          message: data.message,
          stack: data.stack,
          code: data.code
        };
      } else {
        logEntry.data = data;
      }
    }

    // Console output with colors
    this.outputToConsole(level, logEntry);

    // File output if configured
    if (this.logFile) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * Output log entry to console with colors
   * @param {string} level - Log level
   * @param {object} logEntry - Log entry object
   */
  outputToConsole(level, logEntry) {
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m'  // Gray
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || '';
    
    const consoleMessage = `${color}[${logEntry.timestamp}] ${logEntry.level}: ${logEntry.message}${reset}`;
    
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        if (logEntry.error) {
          console.error(color + logEntry.error.stack + reset);
        }
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'debug':
        console.debug(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }

    // Log additional data if present
    if (logEntry.data) {
      console.log(color + JSON.stringify(logEntry.data, null, 2) + reset);
    }
  }

  /**
   * Output log entry to file
   * @param {object} logEntry - Log entry object
   */
  outputToFile(logEntry) {
    try {
      // Check log file size and rotate if needed
      this.rotateLogIfNeeded();

      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  /**
   * Rotate log file if it exceeds max size
   */
  rotateLogIfNeeded() {
    try {
      if (!fs.existsSync(this.logFile)) {
        return;
      }

      const stats = fs.statSync(this.logFile);
      if (stats.size > this.maxLogSize) {
        const rotatedFile = `${this.logFile}.${Date.now()}`;
        fs.renameSync(this.logFile, rotatedFile);
        
        // Keep only last 5 rotated files
        this.cleanupOldLogs();
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error.message);
    }
  }

  /**
   * Clean up old log files
   */
  cleanupOldLogs() {
    try {
      const logDir = path.dirname(this.logFile);
      const logBasename = path.basename(this.logFile);
      
      const files = fs.readdirSync(logDir)
        .filter(file => file.startsWith(logBasename + '.'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          time: fs.statSync(path.join(logDir, file)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      // Keep only the 5 most recent files
      const filesToDelete = files.slice(5);
      for (const file of filesToDelete) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error.message);
    }
  }
}

// Create singleton instance
const errorLogger = new ErrorLogger();

/**
 * Custom error classes for S3 Storage Module
 */

class S3StorageError extends Error {
  constructor(message, code = 'S3_STORAGE_ERROR', statusCode = 500) {
    super(message);
    this.name = 'S3StorageError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class S3ConfigurationError extends S3StorageError {
  constructor(message) {
    super(message, 'S3_CONFIGURATION_ERROR', 400);
    this.name = 'S3ConfigurationError';
  }
}

class S3ConnectionError extends S3StorageError {
  constructor(message, provider = 'unknown') {
    super(message, 'S3_CONNECTION_ERROR', 503);
    this.name = 'S3ConnectionError';
    this.provider = provider;
  }
}

class S3UploadError extends S3StorageError {
  constructor(message, filename = null) {
    super(message, 'S3_UPLOAD_ERROR', 500);
    this.name = 'S3UploadError';
    this.filename = filename;
  }
}

class S3ValidationError extends S3StorageError {
  constructor(message, field = null) {
    super(message, 'S3_VALIDATION_ERROR', 400);
    this.name = 'S3ValidationError';
    this.field = field;
  }
}

class S3AuthenticationError extends S3StorageError {
  constructor(message, provider = 'unknown') {
    super(message, 'S3_AUTHENTICATION_ERROR', 401);
    this.name = 'S3AuthenticationError';
    this.provider = provider;
  }
}

class S3NotFoundError extends S3StorageError {
  constructor(message, key = null) {
    super(message, 'S3_NOT_FOUND_ERROR', 404);
    this.name = 'S3NotFoundError';
    this.key = key;
  }
}

/**
 * Error handler middleware for Express routes
 * @param {Error} error - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
function errorHandler(error, req, res, next) {
  // Log the error
  errorLogger.logError('API Error:', error);

  // Default error response
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An internal server error occurred';

  // Handle specific error types
  if (error instanceof S3StorageError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid ID format';
  } else if (error.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY';
    message = 'Duplicate key error';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Async wrapper to catch errors in async route handlers
 * @param {function} fn - Async function to wrap
 * @returns {function} Wrapped function
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle AWS SDK errors and convert to appropriate error types
 * @param {Error} error - AWS SDK error
 * @param {string} operation - Operation being performed
 * @returns {Error} Converted error
 */
function handleAwsError(error, operation = 'unknown') {
  const errorMessage = error.message || 'Unknown AWS error';
  
  switch (error.name || error.code) {
    case 'NoSuchBucket':
      return new S3ConfigurationError(`Bucket does not exist: ${errorMessage}`);
    
    case 'InvalidAccessKeyId':
      return new S3AuthenticationError(`Invalid access key: ${errorMessage}`);
    
    case 'SignatureDoesNotMatch':
      return new S3AuthenticationError(`Invalid secret key: ${errorMessage}`);
    
    case 'AccessDenied':
      return new S3AuthenticationError(`Access denied: ${errorMessage}`);
    
    case 'NoSuchKey':
      return new S3NotFoundError(`Object not found: ${errorMessage}`);
    
    case 'EntityTooLarge':
      return new S3UploadError(`File too large: ${errorMessage}`);
    
    case 'InvalidRequest':
      return new S3ValidationError(`Invalid request: ${errorMessage}`);
    
    case 'ServiceUnavailable':
    case 'SlowDown':
      return new S3ConnectionError(`Service unavailable: ${errorMessage}`);
    
    case 'NetworkingError':
    case 'TimeoutError':
      return new S3ConnectionError(`Network error during ${operation}: ${errorMessage}`);
    
    default:
      return new S3StorageError(`${operation} failed: ${errorMessage}`);
  }
}

/**
 * Retry function with exponential backoff
 * @param {function} fn - Function to retry
 * @param {object} options - Retry options
 * @returns {Promise} Result of the function
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error instanceof S3AuthenticationError || 
          error instanceof S3ValidationError ||
          error instanceof S3ConfigurationError) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with jitter
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );
      const jitteredDelay = delay + Math.random() * 1000;
      
      errorLogger.logWarning(`Attempt ${attempt + 1} failed, retrying in ${Math.round(jitteredDelay)}ms`, error);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError;
}

/**
 * Sanitize error message for safe display
 * @param {string} message - Error message
 * @returns {string} Sanitized message
 */
function sanitizeErrorMessage(message) {
  if (!message || typeof message !== 'string') {
    return 'An error occurred';
  }
  
  // Remove sensitive information
  return message
    .replace(/access.?key.?id[:\s=]*[a-zA-Z0-9]+/gi, 'access_key_id=***')
    .replace(/secret.?access.?key[:\s=]*[a-zA-Z0-9/+=]+/gi, 'secret_access_key=***')
    .replace(/password[:\s=]*\S+/gi, 'password=***')
    .replace(/token[:\s=]*[a-zA-Z0-9/+=]+/gi, 'token=***');
}

/**
 * Create error summary for analytics
 * @param {Error} error - Error object
 * @param {object} context - Error context
 * @returns {object} Error summary
 */
function createErrorSummary(error, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    type: error.name || 'Error',
    code: error.code || 'UNKNOWN',
    message: sanitizeErrorMessage(error.message),
    statusCode: error.statusCode || 500,
    operation: context.operation || 'unknown',
    provider: context.provider || 'unknown',
    filename: context.filename || null,
    userId: context.userId || null,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}

// Export logging functions
function logError(message, error = null) {
  errorLogger.logError(message, error);
}

function logWarning(message, error = null) {
  errorLogger.logWarning(message, error);
}

function logInfo(message, data = null) {
  errorLogger.logInfo(message, data);
}

function logDebug(message, data = null) {
  errorLogger.logDebug(message, data);
}

module.exports = {
  // Error classes
  S3StorageError,
  S3ConfigurationError,
  S3ConnectionError,
  S3UploadError,
  S3ValidationError,
  S3AuthenticationError,
  S3NotFoundError,
  
  // Error handling functions
  errorHandler,
  asyncHandler,
  handleAwsError,
  retryWithBackoff,
  sanitizeErrorMessage,
  createErrorSummary,
  
  // Logging functions
  logError,
  logWarning,
  logInfo,
  logDebug,
  
  // Logger instance
  ErrorLogger
};